"""Narrow contract tests for the optional Carbon Mapper backend adapter."""

import unittest
import asyncio
from io import BytesIO
from unittest.mock import patch
from urllib.error import HTTPError, URLError

from fastapi import HTTPException
from starlette.requests import Request
from starlette.responses import Response

from app import carbon_mapper as provider
from app.main import no_store_observations
from app.routers import carbon_mapper as routes


def plume(**overrides):
    value = {
        "plume_id": "sample-1", "gas": "CH4", "geometry_json": {
            "type": "Point", "coordinates": [113.9, 22.4]},
        "scene_timestamp": "2026-09-11T04:25:13Z",
        "published_at": "2026-10-11T05:19:15Z",
        "emission_auto": 12.5, "emission_uncertainty_auto": 2.0,
        "plume_quality": None, "status": "published", "hide_emission": False,
    }
    value.update(overrides)
    return value


class CarbonMapperTests(unittest.TestCase):
    def setUp(self):
        provider._REQUEST_TIMES.clear()
        provider._USER_REQUEST_TIMES.clear()

    def test_feature_disabled_and_missing_credential(self):
        with patch.dict("os.environ", {}, clear=True):
            with self.assertRaises(HTTPException) as error:
                provider.require_enabled()
            self.assertEqual(error.exception.status_code, 503)
        with patch.dict("os.environ", {"CARBON_MAPPER_ENABLED": "true"}, clear=True):
            with self.assertRaises(HTTPException) as error:
                provider.require_enabled()
            self.assertEqual(error.exception.status_code, 503)

    def test_query_and_empty_results(self):
        with patch.object(provider, "_get_json", return_value={"items": [], "bbox_count": 0}) as get:
            result = provider.list_plumes(
                [113, 22.2, 114.5, 23.6], "CH4", "2026-01-01", "2026-10-01", 25, "test")
        self.assertEqual(result["items"], [])
        self.assertEqual(result["matchedCount"], 0)
        self.assertEqual(result["cacheStatus"], "disabled")
        params = get.call_args[0][1]
        self.assertEqual(params[:4], [("bbox", 113), ("bbox", 22.2),
                                      ("bbox", 114.5), ("bbox", 23.6)])
        self.assertIn(("datetime", "2026-01-01/2026-10-01"), params)

    def test_real_value_and_hidden_or_null_values(self):
        with patch.object(provider, "_get_json", return_value={"items": [
            plume(), plume(plume_id="hidden", hide_emission=True),
            plume(plume_id="missing", emission_auto=None, emission_uncertainty_auto=None),
        ], "bbox_count": 3}):
            items = provider.list_plumes([113, 22, 114, 23], "CH4", None, None, 3, "test")["items"]
        self.assertEqual(items[0]["emissionRateKgPerHour"], 12.5)
        self.assertIsNone(items[1]["emissionRateKgPerHour"])
        self.assertIsNone(items[1]["emissionUncertaintyKgPerHour"])
        self.assertIsNone(items[2]["emissionRateKgPerHour"])
        self.assertIsNone(items[0]["quality"])
        self.assertEqual(items[0]["coordinateSystem"], "EPSG:4326")
        self.assertEqual(items[0]["source"]["name"], "Carbon Mapper")

    def test_authentication_failure_does_not_echo_secret(self):
        error = HTTPError("https://api.carbonmapper.org/", 401, "unauthorized", {}, BytesIO())
        with patch.object(provider, "urlopen", side_effect=error):
            with self.assertRaises(HTTPException) as result:
                provider._get_json("/plumes/annotated", [], "private-test-token")
        self.assertEqual(result.exception.status_code, 502)
        self.assertNotIn("private-test-token", result.exception.detail)

    def test_upstream_unavailable_and_invalid_payload(self):
        with patch.object(provider, "urlopen", side_effect=URLError("offline")):
            with self.assertRaises(HTTPException) as result:
                provider._get_json("/plumes/annotated", [], "test")
            self.assertEqual(result.exception.status_code, 503)
        with patch.object(provider, "_get_json", return_value={"unexpected": []}):
            with self.assertRaises(HTTPException) as result:
                provider.list_plumes([113, 22, 114, 23], "CH4", None, None, 1, "test")
            self.assertEqual(result.exception.status_code, 502)

    def test_detail_and_invalid_or_unpublished_record(self):
        with patch.object(provider, "_get_json", return_value=plume()):
            self.assertEqual(provider.get_plume("sample-1", "test")["item"]["id"], "sample-1")
        with patch.object(provider, "_get_json", return_value=plume(status="hidden")):
            with self.assertRaises(HTTPException) as result:
                provider.get_plume("sample-1", "test")
            self.assertEqual(result.exception.status_code, 404)

    def test_bbox_validation_and_rate_limit(self):
        for bbox in ("nan,22,114,23", "114,22,113,23", "113,22,114", "999,22,114,23"):
            with self.assertRaises(HTTPException):
                routes._bbox(bbox)
        with patch.object(provider, "_MAX_REQUESTS_PER_MINUTE", 1):
            provider._check_rate_limit()
            with self.assertRaises(HTTPException) as result:
                provider._check_rate_limit()
            self.assertEqual(result.exception.status_code, 429)

    def test_preview_access_requires_allowlisted_platform_user(self):
        with patch.object(provider, "require_enabled", return_value="upstream-test"), \
                patch.dict("os.environ", {"CARBON_MAPPER_ALLOWED_USER_IDS": "7"}, clear=True), \
                patch.object(routes.auth, "_parse_token", return_value=7), \
                patch.object(routes, "SessionLocal") as session:
            session.return_value.query.return_value.filter.return_value.first.return_value = object()
            with self.assertRaises(HTTPException) as missing:
                routes._require_access("")
            self.assertEqual(missing.exception.status_code, 401)
            self.assertEqual(routes._require_access("Bearer local-session-placeholder"), "upstream-test")
            with patch.dict("os.environ", {"CARBON_MAPPER_ALLOWED_USER_IDS": "8"}):
                with self.assertRaises(HTTPException) as denied:
                    routes._require_access("Bearer local-session-placeholder")
                self.assertEqual(denied.exception.status_code, 403)
            session.return_value.query.return_value.filter.return_value.first.return_value = None
            with self.assertRaises(HTTPException) as deleted:
                routes._require_access("Bearer local-session-placeholder")
            self.assertEqual(deleted.exception.status_code, 401)

    def test_preview_access_fails_closed_without_allowlist(self):
        with patch.object(provider, "require_enabled", return_value="upstream-test"), \
                patch.dict("os.environ", {}, clear=True):
            with self.assertRaises(HTTPException) as error:
                routes._require_access("Bearer local-session-placeholder")
            self.assertEqual(error.exception.status_code, 503)

    def test_per_user_quota(self):
        with patch.object(provider, "_MAX_USER_REQUESTS_PER_MINUTE", 1):
            provider.check_user_quota(7)
            with self.assertRaises(HTTPException) as error:
                provider.check_user_quota(7)
            self.assertEqual(error.exception.status_code, 429)
            provider.check_user_quota(8)

    def test_observation_responses_are_not_cached(self):
        async def response_for(path, status):
            scope = {"type": "http", "method": "GET", "path": path,
                     "headers": [], "query_string": b"", "scheme": "http",
                     "server": ("test", 80)}
            async def call_next(_):
                return Response(status_code=status)
            return await no_store_observations(Request(scope), call_next)

        for path, status in (("/api/observations/carbon-mapper", 200),
                             ("/api/observations/carbon-mapper/item", 401),
                             ("/api/observations/carbon-mapper/item", 503)):
            response = asyncio.run(response_for(path, status))
            self.assertEqual(response.headers["Cache-Control"], "no-store")
            self.assertEqual(response.headers["Vary"], "Authorization")
        unrelated = asyncio.run(response_for("/api/health", 200))
        self.assertNotIn("Cache-Control", unrelated.headers)


if __name__ == "__main__":
    unittest.main()
