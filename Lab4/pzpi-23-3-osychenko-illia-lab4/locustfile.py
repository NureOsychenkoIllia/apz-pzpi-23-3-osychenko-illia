"""
Навантажувальний тест для BusOptima API.

Запуск (1 репліка):
    docker compose -f server/docker-compose.yml up -d
    locust -f locustfile.py --headless -u 50 -r 5 --run-time 60s --host http://localhost:8080

Запуск (3 репліки + Nginx):
    docker compose -f server/docker-compose.scale.yml up -d
    locust -f locustfile.py --headless -u 50 -r 5 --run-time 60s --host http://localhost

Автентифікація: якщо BUSOPTIMA_TOKEN не задано, кожен віртуальний
користувач логіниться самостійно через POST /api/auth/login.
Облікові дані беруться зі змінних середовища BUSOPTIMA_EMAIL та
BUSOPTIMA_PASSWORD (типово: dispatcher@busoptima.ua / password123).
"""

import os
import itertools

from locust import HttpUser, between, events, task

_GLOBAL_TOKEN: str = os.getenv("BUSOPTIMA_TOKEN", "")
_ROUTE_IDS = itertools.cycle([1, 2, 4])


@events.init_command_line_parser.add_listener
def _add_arguments(parser):
    parser.add_argument("--token", type=str, default="",
                        help="JWT bearer token (замість автологіну)")


@events.test_start.add_listener
def _apply_cli_token(environment, **kwargs):
    global _GLOBAL_TOKEN
    cli_token = getattr(environment.parsed_options, "token", "")
    if cli_token:
        _GLOBAL_TOKEN = cli_token


class DispatcherUser(HttpUser):
    """Моделює активну роботу диспетчера: перегляд рейсів та аналітики."""

    wait_time = between(0.1, 0.5)

    def on_start(self):
        token = _GLOBAL_TOKEN
        if not token:
            token = self._login()
        self.headers = {"Authorization": f"Bearer {token}"}

    def _login(self) -> str:
        email = os.getenv("BUSOPTIMA_EMAIL", "dispatcher@busoptima.ua")
        password = os.getenv("BUSOPTIMA_PASSWORD", "password123")
        with self.client.post(
            "/api/auth/login",
            json={"email": email, "password": password},
            catch_response=True,
        ) as resp:
            if resp.status_code == 200:
                resp.success()
                return resp.json().get("access_token", "")
            resp.failure(f"Login failed: {resp.status_code}")
            return ""

    @task(5)
    def health_check(self):
        self.client.get("/api/health", name="/api/health")

    @task(4)
    def get_trips(self):
        self.client.get("/api/trips", headers=self.headers, name="/api/trips")

    @task(3)
    def get_routes(self):
        self.client.get("/api/routes", headers=self.headers, name="/api/routes")

    @task(2)
    def get_dashboard(self):
        self.client.get(
            "/api/analytics/dashboard",
            headers=self.headers,
            name="/api/analytics/dashboard",
        )

    @task(1)
    def get_forecast(self):
        route_id = next(_ROUTE_IDS)
        self.client.get(
            f"/api/analytics/forecast?route_id={route_id}",
            headers=self.headers,
            name="/api/analytics/forecast",
        )
