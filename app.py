import os
from flask import Flask

app = Flask(__name__)

@app.route("/api_tareas.php")
def tareas():
    return {"status": "ok"}  # luego aquí conectas con clickup.py

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
