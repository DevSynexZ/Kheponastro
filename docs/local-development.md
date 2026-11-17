# Start everything (recommended)

npm run dev

# Backend only (separate terminal)

source venv/bin/activate && ./venv/bin/python -m uvicorn api.index:app --reload --port 8000

# Run backend tests

./venv/bin/pytest api/solvers/test_engine.py -v

# Verify health

curl http://localhost:8000/api/py/health
curl http://localhost:3000
