"""碳价来源解析与接口降级的小范围回归。"""
import unittest
from unittest.mock import patch

from app.routers import business


LISTING = ('<a href="../../info/1134/2138.htm" class="mid"><div class="txt">'
           '<h3>2026年10月复旦碳价指数</h3><time>2026-09-29</time></div></a>')
ARTICLE = ('<div id="vsb_content"><p>2026年10月全国碳排放配额（CEA）的买入价格预期为'
           '91.42元/吨，卖出价格预期为97.10元/吨，中间价为94.27元/吨。</p>'
           '<p>2026年12月全国碳排放配额（CEA）的买入价格预期为'
           '91.09元/吨，卖出价格预期为100.19元/吨，中间价为95.64元/吨。</p></div>')


class CarbonPriceTests(unittest.TestCase):
    def setUp(self):
        business._MARKET_CACHE.update(ts=0.0, data=None, live=False)

    @patch.object(business, '_http_text', side_effect=[LISTING, ARTICLE])
    def test_fudan_expected_prices_keep_target_and_publication_dates(self, fetch):
        result = business._fetch_fudan_index()
        self.assertEqual(result['month'], '10月')
        self.assertEqual([point['value'] for point in result['forecasts']], [94.27, 95.64])
        self.assertEqual(result['forecasts'][1]['targetMonth'], '2026-12')
        self.assertEqual(result['forecasts'][1]['publishedAt'], '2026-09-29')
        self.assertEqual(result['forecasts'][1]['status'], 'expected')
        self.assertEqual(fetch.call_count, 2)

    @patch.object(business, '_fetch_fudan_index', return_value=None)
    @patch.object(business, '_fetch_cea_official', return_value=None)
    def test_upstream_failure_leaves_chart_without_unverified_points(self, _cea, _fudan):
        result = business._live_market_snapshot()
        self.assertEqual(result['priceRecords'], [])
        self.assertEqual(result['liveSources'], [])

    @patch.object(business, '_fetch_fudan_index', return_value=None)
    @patch.object(business, '_fetch_cea_official', return_value={
        'date': '2026-10-16', 'sourceUrl': 'https://www.cneeex.com/c/2026-10-16/1.shtml',
        'close': 82.4, 'open': 82.0, 'chg': ''})
    def test_latest_real_price_is_one_dated_daily_close(self, _cea, _fudan):
        result = business._live_market_snapshot()
        self.assertEqual(result['priceRecords'][0]['status'], 'observed')
        self.assertEqual(result['priceRecords'][0]['observedAt'], '2026-10-16')
        self.assertEqual(result['priceRecords'][0]['targetMonth'], '2026-10')
        self.assertEqual(result['priceRecords'][0]['kind'], 'spot_close')


if __name__ == '__main__':
    unittest.main()
