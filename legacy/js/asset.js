/* CarbonAI v5.1 — Carbon Asset Management Module */
function renderAssetCharts() {
  LazyLoader.echarts().then(function () {
    var ad = document.getElementById('assetPortfolio');
    if (ad) { var c = echarts.getInstanceByDom(ad); if (c) c.dispose(); echarts.init(ad).setOption({ series: [{ type: 'pie', radius: ['50%', '75%'], data: [{ name: 'CEA配额', value: 58 }, { name: 'CCER', value: 18 }, { name: '碳信用储备', value: 24 }], color: ['#059669', '#0EA5E9', '#fde68a'] }] }); }
  });
  LazyLoader.chartjs().then(function () {
    var ctx = document.getElementById('carbonPriceChart');
    if (ctx) {
      var months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月(预)', '8月(预)', '9月(预)', '10月(预)', '11月(预)', '12月(预)'];
      new Chart(ctx, { type: 'line', data: { labels: months, datasets: [
        { label: 'CEA实际', data: [81.50, 80.20, 82.10, 81.80, 83.00, 81.23, null, null, null, null, null, null], borderColor: '#059669', backgroundColor: 'rgba(5,150,105,0.1)', fill: true, spanGaps: false, pointRadius: 4 },
        { label: '复旦碳价指数预测', data: [null, null, null, null, null, 80.44, 80.00, 80.50, 81.00, 80.50, 80.20, 80.00], borderColor: '#F59E0B', borderDash: [5, 5], fill: false, spanGaps: false },
        { label: 'CCER均价', data: [88.00, 86.50, 88.67, 85.20, 83.50, 82.53, null, null, null, null, null, null], borderColor: '#0EA5E9', backgroundColor: 'rgba(14,165,233,0.05)', fill: true, spanGaps: false },
        { label: 'EUA(¥等值)', data: [690, 705, 680, 672, 665, 658, null, null, null, null, null, null], borderColor: '#8B5CF6', borderDash: [2, 2], fill: false, spanGaps: false, hidden: true }
      ] } });
    }
  });
}
