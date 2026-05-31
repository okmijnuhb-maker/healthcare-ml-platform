# app.py - Main Flask Application
import sys
import time
import logging
import os
from datetime import datetime
from flask import Flask, jsonify, request, g
from flask_cors import CORS

from config import *
from model_loader import load_all_models, get_health_status, get_model_info
from readmission_routes import readmission_bp
from outbreak_routes import outbreak_bp
from resources_routes import resources_bp
from utils import success_response, error_response

# ─────────────────────────────────────────
# LOGGING SETUP
# ─────────────────────────────────────────

os.makedirs(LOGS_DIR, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format=LOG_FORMAT,
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOG_FILE, encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────
# FLASK APP INIT
# ─────────────────────────────────────────

app = Flask(__name__)
app.config['JSON_SORT_KEYS']         = False
app.config['MAX_CONTENT_LENGTH']     = 10 * 1024 * 1024  # 10MB
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = True

CORS(app,
     origins=CORS_ORIGINS,
     methods=['GET', 'POST', 'OPTIONS'],
     allow_headers=['Content-Type', 'Authorization'],
     supports_credentials=True)

# ─────────────────────────────────────────
# SERVER STATE
# ─────────────────────────────────────────

SERVER_START_TIME  = time.time()
request_counter    = {'total': 0}
response_times     = []

# ─────────────────────────────────────────
# REGISTER BLUEPRINTS
# ─────────────────────────────────────────

app.register_blueprint(readmission_bp, url_prefix='/api/readmission')
app.register_blueprint(outbreak_bp,    url_prefix='/api/outbreak')
app.register_blueprint(resources_bp,   url_prefix='/api/resources')

# ─────────────────────────────────────────
# BEFORE / AFTER REQUEST HOOKS
# ─────────────────────────────────────────

@app.before_request
def before_request():
    g.start_time = time.time()
    request_counter['total'] += 1
    logger.info(f"REQUEST  {request.method:6s} {request.path}")

@app.after_request
def after_request(response):
    if hasattr(g, 'start_time'):
        elapsed = round((time.time() - g.start_time) * 1000, 2)
        response_times.append(elapsed)
        response.headers['X-Response-Time'] = f"{elapsed}ms"
        logger.info(f"RESPONSE {request.method:6s} {request.path} "
                    f"→ {response.status_code} ({elapsed}ms)")
    response.headers['X-Powered-By'] = 'HealthcareML-Platform'
    return response

# ─────────────────────────────────────────
# HEALTH ENDPOINT
# ─────────────────────────────────────────

@app.route('/api/health', methods=['GET'])
def health():
    start        = time.time()
    uptime_sec   = round(time.time() - SERVER_START_TIME, 2)
    uptime_hrs   = round(uptime_sec / 3600, 4)
    model_status = get_health_status()
    avg_resp     = round(sum(response_times) / max(len(response_times), 1), 2)

    # All registered endpoints
    endpoints = []
    for rule in app.url_map.iter_rules():
        if rule.endpoint != 'static':
            endpoints.append({
                'endpoint': rule.rule,
                'methods':  sorted([m for m in rule.methods
                                    if m not in ['HEAD', 'OPTIONS']])
            })

    data = {
        'status':         'running' if model_status['ready'] else 'degraded',
        'server': {
            'python_version': sys.version.split()[0],
            'flask_version':  __import__('flask').__version__,
            'port':           FLASK_PORT,
            'debug':          FLASK_DEBUG
        },
        'uptime': {
            'seconds':       uptime_sec,
            'hours':         uptime_hrs,
            'started_at':    datetime.fromtimestamp(SERVER_START_TIME)
                             .strftime('%Y-%m-%d %H:%M:%S')
        },
        'models':          model_status,
        'requests': {
            'total_served':      request_counter['total'],
            'avg_response_ms':   avg_resp
        },
        'endpoints':       sorted(endpoints, key=lambda x: x['endpoint']),
        'model_versions':  get_model_info()
    }

    return jsonify(success_response(data,
        message='Healthcare ML Platform is running',
        start_time=start)), 200

# ─────────────────────────────────────────
# ERROR HANDLERS
# ─────────────────────────────────────────

@app.errorhandler(400)
def bad_request(e):
    return jsonify(error_response(
        'Bad request - please check your input', code=400)), 400

@app.errorhandler(404)
def not_found(e):
    return jsonify(error_response(
        f"Endpoint not found: {request.path}", code=404)), 404

@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify(error_response(
        f"Method {request.method} not allowed for {request.path}",
        code=405)), 405

@app.errorhandler(500)
def internal_error(e):
    logger.error(f"Internal error: {str(e)}")
    return jsonify(error_response(
        'Internal server error', code=500)), 500

@app.errorhandler(Exception)
def unhandled_exception(e):
    logger.error(f"Unhandled exception: {str(e)}")
    return jsonify(error_response(
        f'Unexpected error: {str(e)}', code=500)), 500

# ─────────────────────────────────────────
# STARTUP BANNER
# ─────────────────────────────────────────

def print_banner():
    print("\n" + "="*65)
    print("   HEALTHCARE ML PLATFORM - FLASK BACKEND")
    print("="*65)
    print(f"   Server    : http://localhost:{FLASK_PORT}")
    print(f"   Debug     : {FLASK_DEBUG}")
    print(f"   Started   : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("\n   ENDPOINTS:")
    print("   GET  /api/health")
    print("   POST /api/readmission/predict")
    print("   GET  /api/readmission/info")
    print("   POST /api/readmission/predict-batch")
    print("   POST /api/outbreak/detect")
    print("   GET  /api/outbreak/forecast")
    print("   GET  /api/outbreak/history")
    print("   POST /api/resources/forecast-beds")
    print("   GET  /api/resources/overview")
    print("   GET  /api/resources/staffing")
    print("="*65 + "\n")

# ─────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────

if __name__ == '__main__':
    load_all_models()
    print_banner()
    app.run(
        host='0.0.0.0',
        port=FLASK_PORT,
        debug=FLASK_DEBUG,
        use_reloader=False
    )