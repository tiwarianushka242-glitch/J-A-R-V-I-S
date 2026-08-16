import os
import sys

# Ensure backend directory is in python path
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

if __name__ == '__main__':
    # Change working directory to backend or run backend app
    import app as backend_app
    backend_app.app.run(host='0.0.0.0', port=5000, debug=True)
