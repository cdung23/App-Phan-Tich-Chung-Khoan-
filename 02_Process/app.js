// VIX Stock Trading Assistant Logic
// Global Error Overlay for debugging
window.addEventListener('error', function(event) {
    let errDiv = document.getElementById('debug-error-overlay');
    if (!errDiv) {
        errDiv = document.createElement('div');
        errDiv.id = 'debug-error-overlay';
        errDiv.style.background = '#fef2f2';
        errDiv.style.color = '#991b1b';
        errDiv.style.border = '1px solid #fca5a5';
        errDiv.style.padding = '15px';
        errDiv.style.position = 'fixed';
        errDiv.style.bottom = '20px';
        errDiv.style.right = '20px';
        errDiv.style.zIndex = '99999';
        errDiv.style.borderRadius = '8px';
        errDiv.style.maxWidth = '400px';
        errDiv.style.fontFamily = 'monospace';
        errDiv.style.fontSize = '12px';
        errDiv.style.boxShadow = '0 10px 20px rgba(0,0,0,0.3)';
        document.body.appendChild(errDiv);
    }
    errDiv.innerHTML = `<strong>JS Error:</strong> ${event.message}<br><span style="color:#6b7280; font-size:10px;">${event.filename}:${event.lineno}</span>`;
});

document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const fileInput = document.getElementById("csv-file");
    const sourceStatus = document.getElementById("source-status");
    const headerLastPrice = document.getElementById("header-last-price");
    const headerPriceChange = document.getElementById("header-price-change");
    const headerPriceBadge = document.getElementById("header-price-badge");
    const kpiClose = document.getElementById("kpi-close");
    const kpiChangeSub = document.getElementById("kpi-change-sub");
    const kpiVolume = document.getElementById("kpi-volume");
    const kpiRsi = document.getElementById("kpi-rsi");
    const kpiRsiSub = document.getElementById("kpi-rsi-sub");
    const kpiTrend = document.getElementById("kpi-trend");
    const kpiSmaSub = document.getElementById("kpi-sma-sub");
    const mainSignalBadge = document.getElementById("main-signal-badge");
    const signalConfidence = document.getElementById("signal-confidence");
    const signalBuyZone = document.getElementById("signal-buy-zone");
    const signalTarget = document.getElementById("signal-target");
    const signalStopLoss = document.getElementById("signal-stop-loss");
    const signalExplanation = document.getElementById("signal-explanation");
    const recentTable = document.getElementById("recent-table").getElementsByTagName("tbody")[0];
    const allHistoryTable = document.getElementById("all-history-table").getElementsByTagName("tbody")[0];
    const searchDateInput = document.getElementById("search-date");
    const dataRangeLabel = document.getElementById("data-range-label");
    
    // Ticker Search DOM Elements
    const tickerInput = document.getElementById("ticker-input");
    const btnSearchTicker = document.getElementById("btn-search-ticker");
    const logoBrand = document.getElementById("logo-brand");
    const logoSub = document.getElementById("logo-sub");
    
    // View Switchers
    const btnDashboard = document.getElementById("btn-dashboard");
    const btnSignals = document.getElementById("btn-signals");
    const btnHistory = document.getElementById("btn-history");
    const dashboardView = document.getElementById("dashboard-view");
    const signalsView = document.getElementById("signals-view");
    const historyView = document.getElementById("history-view");

    // Indicator Elements (in Signals View)
    const indicatorSmaStatus = document.getElementById("indicator-sma-status");
    const indicatorSmaDesc = document.getElementById("indicator-sma-desc");
    const indicatorEmaStatus = document.getElementById("indicator-ema-status");
    const indicatorEmaDesc = document.getElementById("indicator-ema-desc");
    const indicatorRsiStatus = document.getElementById("indicator-rsi-status");
    const indicatorRsiDesc = document.getElementById("indicator-rsi-desc");
    const indicatorMacdStatus = document.getElementById("indicator-macd-status");
    const indicatorMacdDesc = document.getElementById("indicator-macd-desc");
    const indicatorVolStatus = document.getElementById("indicator-vol-status");
    const indicatorVolDesc = document.getElementById("indicator-vol-desc");
    const indicatorSrStatus = document.getElementById("indicator-sr-status");
    const indicatorSrDesc = document.getElementById("indicator-sr-desc");

    // Global State
    let currentTicker = "VIX";
    let rawData = []; // Reverse chronological (newest to oldest)
    let processedData = []; // Chronological (oldest to newest) for indicators
    let chartInstance = null;
    let candlestickSeries = null;
    let smaSeries = null;
    let ema50Series = null;
    let bollingerUpperSeries = null;
    let bollingerLowerSeries = null;
    let volumeSeries = null;
    let forecastVolumeSeries = null;
    let chartDays = "all"; // all, 90, 30

    // Initialize View Navigation
    const views = [
        { btn: btnDashboard, el: dashboardView },
        { btn: btnSignals, el: signalsView },
        { btn: btnHistory, el: historyView }
    ];

    views.forEach(v => {
        v.btn.addEventListener("click", (e) => {
            e.preventDefault();
            views.forEach(x => {
                x.btn.classList.remove("active");
                x.el.classList.add("hidden");
            });
            v.btn.classList.add("active");
            v.el.classList.remove("hidden");
            
            // Resize chart if showing dashboard (Lightweight Charts requirement)
            if (v.el === dashboardView && chartInstance) {
                resizeChart();
            }
        });
    });

    // Try fetching live data, fallback to local CSV, fallback to manual upload
    loadData();

    function loadData() {
        sourceStatus.innerHTML = `<span class="status-dot warning"></span> Đang tải: ${currentTicker}...`;
        
        // Fetch from VNDirect API (CORS-enabled)
        // 3 years of data (approx 94608000 seconds)
        const toTimestamp = Math.floor(Date.now() / 1000);
        const fromTimestamp = toTimestamp - 94608000;
        const vndirectUrl = `https://dchart-api.vndirect.com.vn/dchart/history?symbol=${currentTicker}&resolution=D&from=${fromTimestamp}&to=${toTimestamp}`;

        fetch(vndirectUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error("API VNDirect không phản hồi");
                }
                return response.json();
            })
            .then(data => {
                if (data && data.s === "ok" && data.t && data.t.length > 0) {
                    sourceStatus.innerHTML = `<span class="status-dot success"></span> Trực tuyến (${currentTicker})`;
                    processApiData(data);
                } else {
                    throw new Error("Mã chứng khoán không tồn tại hoặc dữ liệu trống");
                }
            })
            .catch(err => {
                console.warn(`Lỗi tải API cho ${currentTicker}, chuyển sang dữ liệu CSV dự phòng:`, err.message);
                if (currentTicker === "VIX") {
                    loadLocalCsvFallback();
                } else {
                    sourceStatus.innerHTML = `<span class="status-dot danger"></span> Lỗi tải ${currentTicker}`;
                    signalExplanation.innerHTML = `<strong>Không thể tải dữ liệu tự động cho ${currentTicker}:</strong> Lỗi kết nối API hoặc mã cổ phiếu không tồn tại.<br><br>👉 Vui lòng kiểm tra lại kết nối mạng hoặc thử nhập mã chứng khoán chính xác (ví dụ: FPT, HPG, TCB, VIX).`;
                }
            });
    }

    // Local CSV Fallback Loader
    function loadLocalCsvFallback() {
        sourceStatus.innerHTML = '<span class="status-dot warning"></span> Tải dữ liệu dự phòng...';
        const defaultCsvPath = "../01_Inputs/dữ liệu giao dịch VIX.csv";
        
        fetch(defaultCsvPath)
            .then(response => {
                if (!response.ok) {
                    throw new Error("Không thể tải file CSV nội bộ");
                }
                return response.text();
            })
            .then(text => {
                sourceStatus.innerHTML = '<span class="status-dot success"></span> Dự phòng (File VIX.csv)';
                processCSV(text);
            })
            .catch(err => {
                console.error("Lỗi tải dữ liệu dự phòng:", err.message);
                sourceStatus.innerHTML = '<span class="status-dot danger"></span> Lỗi tải dữ liệu. Hãy tải file lên!';
                signalExplanation.innerHTML = `<strong>Không thể tải dữ liệu tự động:</strong> Lỗi kết nối API và không tìm thấy file CSV dự phòng trong thư mục <code>01_Inputs</code>.<br><br>👉 Bạn hãy chọn nút <strong>"Tải lên CSV khác"</strong> ở thanh menu trái và chọn file <code>dữ liệu giao dịch VIX.csv</code> để kích hoạt trợ lý.`;
            });
    }

    // Manual Upload Handler
    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        sourceStatus.innerHTML = `<span class="status-dot warning"></span> Đang xử lý: ${file.name}`;
        
        const reader = new FileReader();
        reader.onload = (evt) => {
            sourceStatus.innerHTML = `<span class="status-dot success"></span> Đã tải: ${file.name}`;
            processCSV(evt.target.result);
        };
        reader.readAsText(file, "UTF-8");
    });

    // Process VNDirect API JSON Data
    function processApiData(d) {
        const dataRows = [];
        const len = d.t.length;

        for (let i = 0; i < len; i++) {
            const timestamp = d.t[i];
            const date = new Date(timestamp * 1000);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const dateStr = `${day}/${month}/${year}`;
            const chartDate = `${year}-${month}-${day}`;

            // VNDirect values are adjusted and divided by 1000
            const closePrice = Math.round(d.c[i] * 1000);
            const openPrice = Math.round(d.o[i] * 1000);
            const highPrice = Math.round(d.h[i] * 1000);
            const lowPrice = Math.round(d.l[i] * 1000);
            const volume = d.v[i];

            // Estimate ref price as yesterday's close
            const refPrice = i > 0 ? Math.round(d.c[i-1] * 1000) : openPrice;
            const change = closePrice - refPrice;
            const changePct = refPrice > 0 ? (change / refPrice) * 100 : 0;
            const avgPrice = Math.round((openPrice + highPrice + lowPrice + closePrice) / 4);
            const value = Math.round(avgPrice * volume);

            dataRows.push({
                stt: i + 1,
                dateStr,
                chartDate,
                ticker: currentTicker,
                open: openPrice,
                high: highPrice,
                low: lowPrice,
                close: closePrice,
                ref: refPrice,
                avg: avgPrice,
                change,
                changePct,
                volume,
                value,
                totalVolume: volume,
                totalValue: value
            });
        }

        // VNDirect API is chronological (oldest to newest)
        processedData = [...dataRows];
        rawData = [...dataRows].reverse();

        // Calculate Indicators
        calculateSMA20();
        calculateRSI14();
        calculateEMAIndicators();
        calculateBollingerBands();
        calculateMACD();

        // Update logo and header labels
        if (logoBrand) logoBrand.textContent = currentTicker;
        const pageTitle = document.getElementById("page-title");
        if (pageTitle) pageTitle.textContent = `Trực quan hóa & Phân tích Kỹ thuật - Mã ${currentTicker}`;
        const tickerElements = document.querySelectorAll(".ticker");
        tickerElements.forEach(el => el.textContent = currentTicker);

        // Update Dashboard
        try {
            updateDashboardUI();
            initChart();
            updateRecentTable();
            updateHistoryTable();
            updateSignalsView();
        } catch (err) {
            console.error("Lỗi khi hiển thị dữ liệu API:", err);
        }
    }

    // CSV Parsing Helper (handles comma inside double quotes)
    function parseCSVLine(text) {
        let ret = [];
        let inQuote = false;
        let token = "";
        for (let i = 0; i < text.length; i++) {
            let c = text[i];
            if (c === '"') {
                inQuote = !inQuote;
            } else if (c === ',' && !inQuote) {
                ret.push(token.trim());
                token = "";
            } else {
                token += c;
            }
        }
        ret.push(token.trim());
        return ret;
    }

    // Number parser
    function parseNumber(str) {
        if (!str) return 0;
        let s = str.trim();
        let isNegative = false;
        if (s.startsWith('(') && s.endsWith(')')) {
            isNegative = true;
            s = s.substring(1, s.length - 1);
        }
        s = s.replace(/,/g, ''); // Remove commas
        let val = parseFloat(s);
        if (isNaN(val)) return 0;
        return isNegative ? -val : val;
    }

    // Process local/uploaded CSV data
    function processCSV(csvText) {
        const lines = csvText.split(/\r?\n/);
        const dataRows = [];
        let detectedTicker = null;
        
        // Loop from line 10
        for (let i = 9; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const columns = parseCSVLine(line);
            if (columns.length < 10) continue;
            
            const rowDate = columns[1];
            const ticker = columns[2] ? columns[2].trim().toUpperCase() : null;
            if (!ticker) continue;

            if (!detectedTicker) {
                detectedTicker = ticker;
                currentTicker = ticker; // Update global state
            }
            
            if (ticker !== detectedTicker) continue;

            const refPrice = parseNumber(columns[3]);
            const openPrice = parseNumber(columns[4]);
            const closePrice = parseNumber(columns[5]);
            const highPrice = parseNumber(columns[6]);
            const lowPrice = parseNumber(columns[7]);
            const avgPrice = parseNumber(columns[8]);
            const priceChange = parseNumber(columns[9]);
            const priceChangePct = parseNumber(columns[10]);
            
            const matchVol = parseNumber(columns[11]);
            const matchVal = parseNumber(columns[12]);
            const totalVol = parseNumber(columns[15]);
            const totalVal = parseNumber(columns[16]);

            dataRows.push({
                stt: parseInt(columns[0], 10),
                dateStr: rowDate,
                chartDate: formatDateForChart(rowDate),
                ticker,
                open: openPrice,
                high: highPrice,
                low: lowPrice,
                close: closePrice,
                ref: refPrice,
                avg: avgPrice,
                change: priceChange,
                changePct: priceChangePct,
                volume: matchVol,
                value: matchVal,
                totalVolume: totalVol,
                totalValue: totalVal
            });
        }

        if (dataRows.length === 0) {
            alert("Không tìm thấy dữ liệu hợp lệ trong file CSV.");
            return;
        }

        rawData = [...dataRows];
        processedData = [...dataRows].reverse();

        // Calculate Indicators
        calculateSMA20();
        calculateRSI14();
        calculateEMAIndicators();
        calculateBollingerBands();
        calculateMACD();

        // Update logo and header labels
        if (logoBrand) logoBrand.textContent = currentTicker;
        const pageTitle = document.getElementById("page-title");
        if (pageTitle) pageTitle.textContent = `Trực quan hóa & Phân tích Kỹ thuật - Mã ${currentTicker}`;
        const tickerElements = document.querySelectorAll(".ticker");
        tickerElements.forEach(el => el.textContent = currentTicker);

        // Update UI
        try {
            updateDashboardUI();
            initChart();
            updateRecentTable();
            updateHistoryTable();
            updateSignalsView();
        } catch (err) {
            console.error("Lỗi khi hiển thị dữ liệu CSV:", err);
        }
    }

    function formatDateForChart(dateStr) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        return dateStr;
    }

    // SMA 20 Calculation
    function calculateSMA20() {
        for (let i = 0; i < processedData.length; i++) {
            if (i < 19) {
                processedData[i].sma20 = null;
            } else {
                let sum = 0;
                for (let j = i - 19; j <= i; j++) {
                    sum += processedData[j].close;
                }
                processedData[i].sma20 = sum / 20;
            }
        }
    }

    // RSI 14 Calculation
    function calculateRSI14() {
        if (processedData.length < 15) return;

        let gains = [];
        let losses = [];

        for (let i = 1; i < processedData.length; i++) {
            let diff = processedData[i].close - processedData[i - 1].close;
            gains.push(diff > 0 ? diff : 0);
            losses.push(diff < 0 ? -diff : 0);
        }

        let avgGain = gains.slice(0, 14).reduce((a, b) => a + b, 0) / 14;
        let avgLoss = losses.slice(0, 14).reduce((a, b) => a + b, 0) / 14;

        if (avgLoss === 0) {
            processedData[14].rsi14 = 100;
        } else {
            let rs = avgGain / avgLoss;
            processedData[14].rsi14 = 100 - (100 / (1 + rs));
        }

        for (let i = 15; i < processedData.length; i++) {
            let gain = gains[i - 1];
            let loss = losses[i - 1];

            avgGain = (avgGain * 13 + gain) / 14;
            avgLoss = (avgLoss * 13 + loss) / 14;

            if (avgLoss === 0) {
                processedData[i].rsi14 = 100;
            } else {
                let rs = avgGain / avgLoss;
                processedData[i].rsi14 = 100 - (100 / (1 + rs));
            }
        }
    }

    // General EMA Helper
    function calculateEMA(data, period, key) {
        if (data.length < period) return;
        const k = 2 / (period + 1);
        
        // Initial value is SMA of first 'period' closes
        let sum = 0;
        for (let i = 0; i < period; i++) {
            sum += data[i].close;
        }
        data[period - 1][key] = sum / period;

        for (let i = period; i < data.length; i++) {
            data[i][key] = data[i].close * k + data[i - 1][key] * (1 - k);
        }
        
        // Fill null for indices before period
        for (let i = 0; i < period - 1; i++) {
            data[i][key] = null;
        }
    }

    // EMA 20 and EMA 50 Calculations
    function calculateEMAIndicators() {
        calculateEMA(processedData, 20, 'ema20');
        calculateEMA(processedData, 50, 'ema50');
    }

    // Bollinger Bands Calculation
    function calculateBollingerBands() {
        for (let i = 0; i < processedData.length; i++) {
            if (i < 19 || processedData[i].sma20 === null) {
                processedData[i].bbUpper = null;
                processedData[i].bbLower = null;
                processedData[i].bbMiddle = null;
            } else {
                const sma = processedData[i].sma20;
                let sumVariance = 0;
                for (let j = i - 19; j <= i; j++) {
                    sumVariance += Math.pow(processedData[j].close - sma, 2);
                }
                const stdDev = Math.sqrt(sumVariance / 20);
                processedData[i].bbMiddle = sma;
                processedData[i].bbUpper = sma + 2 * stdDev;
                processedData[i].bbLower = sma - 2 * stdDev;
            }
        }
    }

    // MACD Calculation
    function calculateMACD() {
        // We need temporary EMA 12 and EMA 26
        calculateEMA(processedData, 12, 'ema12');
        calculateEMA(processedData, 26, 'ema26');

        for (let i = 0; i < processedData.length; i++) {
            if (processedData[i].ema12 !== null && processedData[i].ema26 !== null) {
                processedData[i].macd = processedData[i].ema12 - processedData[i].ema26;
            } else {
                processedData[i].macd = null;
            }
        }

        // Now calculate Signal Line (EMA 9 of MACD)
        let firstMacdIdx = -1;
        for (let i = 0; i < processedData.length; i++) {
            if (processedData[i].macd !== null) {
                firstMacdIdx = i;
                break;
            }
        }

        if (firstMacdIdx === -1 || processedData.length - firstMacdIdx < 9) {
            for (let i = 0; i < processedData.length; i++) {
                processedData[i].macdSignal = null;
                processedData[i].macdHist = null;
            }
            return;
        }

        const period = 9;
        const k = 2 / (period + 1);
        
        // Initial Signal Line value is SMA of MACD over 9 periods
        let sum = 0;
        for (let i = firstMacdIdx; i < firstMacdIdx + period; i++) {
            sum += processedData[i].macd;
        }
        processedData[firstMacdIdx + period - 1].macdSignal = sum / period;

        for (let i = firstMacdIdx + period; i < processedData.length; i++) {
            processedData[i].macdSignal = processedData[i].macd * k + processedData[i - 1].macdSignal * (1 - k);
        }

        // Fill null for indices before
        for (let i = 0; i < firstMacdIdx + period - 1; i++) {
            processedData[i].macdSignal = null;
        }

        // Calculate Histogram
        for (let i = 0; i < processedData.length; i++) {
            if (processedData[i].macd !== null && processedData[i].macdSignal !== null) {
                processedData[i].macdHist = processedData[i].macd - processedData[i].macdSignal;
            } else {
                processedData[i].macdHist = null;
            }
        }
    }

    // Support and Resistance pivots calculation
    function calculateSupportResistance() {
        if (processedData.length < 50) return { support: null, resistance: null };

        const supports = [];
        const resistances = [];
        const lookback = Math.min(100, processedData.length);
        const startIndex = processedData.length - lookback;

        // Window size of 5 days
        const window = 5;

        for (let i = startIndex + window; i < processedData.length - window; i++) {
            const currentClose = processedData[i].close;
            let isPeak = true;
            let isTrough = true;

            for (let j = i - window; j <= i + window; j++) {
                if (i === j) continue;
                if (processedData[j].close >= currentClose) isPeak = false;
                if (processedData[j].close <= currentClose) isTrough = false;
            }

            if (isPeak) {
                resistances.push({ price: currentClose, index: i });
            }
            if (isTrough) {
                supports.push({ price: currentClose, index: i });
            }
        }

        const latestClose = processedData[processedData.length - 1].close;
        
        // Sort resistances above current close (ascending)
        const activeResistances = resistances
            .filter(r => r.price > latestClose)
            .sort((a, b) => a.price - b.price);
            
        // Sort supports below current close (descending)
        const activeSupports = supports
            .filter(s => s.price < latestClose)
            .sort((a, b) => b.price - a.price);

        return {
            support: activeSupports[0] ? activeSupports[0].price : Math.round(latestClose * 0.95),
            resistance: activeResistances[0] ? activeResistances[0].price : Math.round(latestClose * 1.05)
        };
    }

    // Japanese Candlestick Patterns recognition
    function detectCandlestickPattern(i) {
        if (i < 1) return null;
        const today = processedData[i];
        const yesterday = processedData[i - 1];

        const body = Math.abs(today.close - today.open);
        const upperShadow = today.high - Math.max(today.open, today.close);
        const lowerShadow = Math.min(today.open, today.close) - today.low;
        const totalHeight = today.high - today.low;

        if (totalHeight === 0) return null;

        const isGreen = today.close > today.open;
        const isRed = today.open > today.close;

        const yBody = Math.abs(yesterday.close - yesterday.open);
        const yIsGreen = yesterday.close > yesterday.open;
        const yIsRed = yesterday.open > yesterday.close;

        // Doji
        if (body <= totalHeight * 0.1) {
            return { name: "Doji", type: "neutral", text: "Nến Doji thể hiện sự giằng co, lưỡng lự lớn giữa phe mua và phe bán." };
        }

        // Hammer (Búa)
        if (lowerShadow >= body * 1.8 && upperShadow <= totalHeight * 0.15 && today.close < today.ema20) {
            return { name: "Hammer", type: "bullish", text: "Nến Búa (Hammer) xuất hiện trong xu hướng giảm báo hiệu phe mua bắt đáy mạnh mẽ." };
        }

        // Shooting Star (Búa ngược)
        if (upperShadow >= body * 1.8 && lowerShadow <= totalHeight * 0.15 && today.close > today.ema20) {
            return { name: "Shooting Star", type: "bearish", text: "Nến Búa Ngược (Shooting Star) ở đỉnh xu hướng báo hiệu áp lực chốt lời gia tăng." };
        }

        // Bullish Engulfing
        if (isGreen && yIsRed && today.open <= yesterday.close && today.close > yesterday.open) {
            return { name: "Bullish Engulfing", type: "bullish", text: "Mô hình Nhấn Chìm Tăng (Bullish Engulfing) cho thấy phe mua đã hoàn toàn giành quyền kiểm soát." };
        }

        // Bearish Engulfing
        if (isRed && yIsGreen && today.open >= yesterday.close && today.close < yesterday.open) {
            return { name: "Bearish Engulfing", type: "bearish", text: "Mô hình Nhấn Chìm Giảm (Bearish Engulfing) cảnh báo lực bán tháo nuốt chửng lực mua hôm trước." };
        }

        return null;
    }

    function calculateHoltForecast(data, key, steps) {
        const n = data.length;
        if (n < 5) return [];

        const alpha = 0.3;
        const beta = 0.1;

        let level = data[0][key];
        let trend = data[1][key] - data[0][key];

        for (let i = 1; i < n; i++) {
            const lastLevel = level;
            const lastTrend = trend;
            const val = data[i][key];
            
            level = alpha * val + (1 - alpha) * (lastLevel + lastTrend);
            trend = beta * (level - lastLevel) + (1 - beta) * lastTrend;
        }

        const forecast = [];
        for (let h = 1; h <= steps; h++) {
            let pred = level + h * trend;
            if (key === 'volume') {
                pred = Math.max(0, pred);
            } else {
                pred = Math.max(100, pred); // Giá cổ phiếu tối thiểu 100 VNĐ
            }
            forecast.push(Math.round(pred));
        }
        return forecast;
    }

    function getNextBusinessDays(startDateStr, numDays) {
        const parts = startDateStr.split('-');
        if (parts.length !== 3) return [];
        
        const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        const result = [];
        let count = 0;
        
        while (count < numDays) {
            date.setDate(date.getDate() + 1);
            const day = date.getDay();
            if (day !== 0 && day !== 6) {
                const yyyy = date.getFullYear();
                const mm = String(date.getMonth() + 1).padStart(2, '0');
                const dd = String(date.getDate()).padStart(2, '0');
                result.push(`${yyyy}-${mm}-${dd}`);
                count++;
            }
        }
        return result;
    }



    function formatMoney(num) {
        return num.toLocaleString('vi-VN');
    }

    function formatVolume(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(2) + " Tr";
        }
        return formatMoney(num);
    }

    function formatChange(change, changePct) {
        const sign = change > 0 ? "+" : "";
        return `${sign}${formatMoney(change)} (${sign}${changePct.toFixed(2)}%)`;
    }

    function updateDashboardUI() {
        const latest = rawData[0];
        
        // Header
        headerLastPrice.textContent = formatMoney(latest.close);
        headerPriceChange.textContent = `${latest.changePct > 0 ? "+" : ""}${latest.changePct.toFixed(2)}%`;
        
        if (latest.changePct > 0) {
            headerPriceBadge.className = "price-badge up";
        } else if (latest.changePct < 0) {
            headerPriceBadge.className = "price-badge down";
        } else {
            headerPriceBadge.className = "price-badge";
        }

        // Date range
        const oldest = rawData[rawData.length - 1];
        dataRangeLabel.textContent = `Dữ liệu VIX từ ${oldest.dateStr} đến ${latest.dateStr}`;

        // KPI 1: Close
        kpiClose.textContent = formatMoney(latest.close) + " đ";
        kpiChangeSub.textContent = formatChange(latest.change, latest.changePct);
        kpiChangeSub.className = "kpi-sub " + (latest.change >= 0 ? "up" : "down");

        // KPI 2: Volume
        kpiVolume.textContent = formatVolume(latest.volume);
        kpiVolume.nextElementSibling.textContent = `Giá trị khớp: ${formatVolume(latest.value)} VNĐ`;

        // KPI 3: RSI
        if (latest.rsi14) {
            kpiRsi.textContent = latest.rsi14.toFixed(2);
            if (latest.rsi14 > 70) {
                kpiRsiSub.textContent = "Quá mua (Overbought)";
                kpiRsiSub.className = "kpi-sub down";
            } else if (latest.rsi14 < 30) {
                kpiRsiSub.textContent = "Quá bán (Oversold)";
                kpiRsiSub.className = "kpi-sub up";
            } else {
                kpiRsiSub.textContent = "Trung lập";
                kpiRsiSub.className = "kpi-sub";
            }
        } else {
            kpiRsi.textContent = "--";
            kpiRsiSub.textContent = "Không đủ dữ liệu";
        }

        // KPI 4: SMA Trend
        if (latest.sma20) {
            const diffPct = ((latest.close - latest.sma20) / latest.sma20) * 100;
            kpiTrend.textContent = latest.close > latest.sma20 ? "Tăng giá" : "Giảm giá";
            kpiTrend.className = "kpi-value " + (latest.close > latest.sma20 ? "text-success" : "text-danger");
            kpiSmaSub.textContent = `${diffPct > 0 ? "+" : ""}${diffPct.toFixed(2)}% so với SMA(20) (${formatMoney(Math.round(latest.sma20))})`;
        } else {
            kpiTrend.textContent = "--";
            kpiSmaSub.textContent = "Chưa có đường SMA";
        }

        generateAISignal();
    }

    function generateAISignal() {
        const checklistItems = document.getElementById("checklist-items");
        const setupIcon = document.getElementById("setup-icon");
        const setupName = document.getElementById("setup-name");
        const opportunityValue = document.getElementById("opportunity-value");
        const opportunityBar = document.getElementById("opportunity-bar");
        const setupAction = document.getElementById("setup-action");
        const setupExplanation = document.getElementById("setup-explanation");
        
        if (processedData.length < 20) {
            mainSignalBadge.textContent = "Thiếu Dữ Liệu";
            mainSignalBadge.className = "signal-value-badge neutral";
            if (checklistItems) {
                checklistItems.innerHTML = `<li class="checklist-placeholder">Cần tối thiểu 20 phiên dữ liệu để tính toán chỉ báo.</li>`;
            }
            if (setupName) setupName.textContent = "Thiếu dữ liệu lịch sử";
            return;
        }

        const latestIdx = processedData.length - 1;
        const today = processedData[latestIdx];
        const yesterday = processedData[latestIdx - 1];
        
        const close = today.close;
        const sma = today.sma20;
        const rsi = today.rsi14;
        const vol = today.volume;

        // 1. Tính toán Xu hướng cấu trúc trung-dài hạn (EMA50 Slope)
        let ema50Slope = 0;
        if (latestIdx >= 5 && today.ema50 && processedData[latestIdx - 5].ema50) {
            ema50Slope = (today.ema50 - processedData[latestIdx - 5].ema50) / 5;
        }

        // Tính trung bình khối lượng 20 phiên qua
        let avgVol = 0;
        for (let i = 0; i < 20; i++) {
            const idx = latestIdx - i;
            if (idx >= 0) avgVol += processedData[idx].volume;
        }
        avgVol = avgVol / 20;

        const isVolBreakout = vol > avgVol * 1.3;

        let score = 0;
        let checklist = [];

        // --- LỚP 1: CẤU TRÚC XU HƯỚNG DÀI HẠN (Trọng số lớn - Không phụ thuộc 1 phiên) ---
        const isLongTermUptrend = today.ema50 && ema50Slope > 0 && close > today.ema50;
        const isLongTermDowntrend = today.ema50 && ema50Slope < 0 && close < today.ema50;

        if (isLongTermUptrend) {
            score += 2;
            checklist.push({
                type: "bullish",
                label: `Cấu trúc Uptrend dài hạn: Giá trên EMA50 dốc lên`,
                score: 2
            });
            
            if (today.ema20 && close > today.ema20) {
                score += 1;
                checklist.push({
                    type: "bullish",
                    label: `Đồng thuận xu hướng ngắn hạn: Giá nằm trên EMA20`,
                    score: 1
                });
            }
        } else if (isLongTermDowntrend) {
            score -= 2;
            checklist.push({
                type: "bearish",
                label: `Cấu trúc Downtrend dài hạn: Giá dưới EMA50 dốc xuống`,
                score: -2
            });
            
            if (today.ema20 && close < today.ema20) {
                score -= 1;
                checklist.push({
                    type: "bearish",
                    label: `Đồng thuận xu hướng giảm ngắn hạn: Giá nằm dưới EMA20`,
                    score: -1
                });
            }
        } else {
            checklist.push({
                type: "neutral",
                label: `Cấu trúc giá đi ngang (Sideway), EMA50 đi ngang`,
                score: 0
            });
        }

        // EMA Cross trong 5 phiên gần nhất
        let goldenCross = false;
        let deathCross = false;
        for (let i = 0; i < 5; i++) {
            const idx = latestIdx - i;
            if (idx > 0 && processedData[idx].ema20 && processedData[idx].ema50) {
                const t = processedData[idx];
                const y = processedData[idx - 1];
                if (y.ema20 && y.ema50) {
                    if (y.ema20 <= y.ema50 && t.ema20 > t.ema50) goldenCross = true;
                    if (y.ema20 >= y.ema50 && t.ema20 < t.ema50) deathCross = true;
                }
            }
        }
        if (goldenCross && !isLongTermDowntrend) {
            score += 1;
            checklist.push({
                type: "bullish",
                label: `Giao cắt Vàng (EMA20 vượt trên EMA50) mới xuất hiện`,
                score: 1
            });
        } else if (deathCross && !isLongTermUptrend) {
            score -= 1;
            checklist.push({
                type: "bearish",
                label: `Giao cắt Tử thần (EMA20 cắt dưới EMA50) mới xuất hiện`,
                score: -1
            });
        }

        // --- LỚP 2: ĐỘNG LƯỢNG TRUNG HẠN (MACD & RSI) ---
        if (today.macd !== null && today.macdSignal !== null) {
            const hist = today.macdHist;
            const prevHist = yesterday.macdHist || 0;
            if (hist > 0) {
                if (prevHist <= 0) {
                    score += 1;
                    checklist.push({
                        type: "bullish",
                        label: `MACD cắt hướng lên đường Tín hiệu (Động lượng tăng mới)`,
                        score: 1
                    });
                } else {
                    checklist.push({
                        type: "bullish",
                        label: `MACD nằm trên đường Tín hiệu (Đà tăng duy trì)`,
                        score: 0.5
                    });
                    score += 0.5;
                }
            } else if (hist < 0) {
                if (prevHist >= 0) {
                    score -= 1;
                    checklist.push({
                        type: "bearish",
                        label: `MACD cắt hướng xuống đường Tín hiệu (Động lượng giảm mới)`,
                        score: -1
                    });
                } else {
                    checklist.push({
                        type: "bearish",
                        label: `MACD nằm dưới đường Tín hiệu (Đà giảm tiếp diễn)`,
                        score: -0.5
                    });
                    score -= 0.5;
                }
            }
        }

        // RSI
        if (rsi) {
            if (rsi < 30) {
                score += 1;
                checklist.push({
                    type: "bullish",
                    label: `RSI vào vùng Quá bán (${rsi.toFixed(1)}): Quá đà giảm`,
                    score: 1
                });
            } else if (rsi > 70) {
                score -= 1;
                checklist.push({
                    type: "bearish",
                    label: `RSI vào vùng Quá mua (${rsi.toFixed(1)}): Quá đà tăng`,
                    score: -1
                });
            }
        }

        // --- LỚP 3: BIẾN ĐỘNG & VÙNG CỰC TRỊ (Bollinger Bands & Cản cứng) ---
        const sr = calculateSupportResistance();
        let distSupport = 999;
        let distResist = 999;

        if (sr.support) distSupport = (close - sr.support) / sr.support;
        if (sr.resistance) distResist = (sr.resistance - close) / close;

        // Bollinger Bands
        if (today.bbUpper && today.bbLower) {
            const low = today.low;
            const high = today.high;
            const bbu = today.bbUpper;
            const bbl = today.bbLower;

            if (low <= bbl && close > bbl) {
                score += 1;
                checklist.push({
                    type: "bullish",
                    label: `Giá chạm dải dưới Bollinger Bands rút chân lên`,
                    score: 1
                });
            } else if (high >= bbu && close < bbu) {
                score -= 1;
                checklist.push({
                    type: "bearish",
                    label: `Giá chạm dải trên Bollinger Bands bị bán dội lại`,
                    score: -1
                });
            }
        }

        // Khoảng cách hỗ trợ/kháng cự cứng
        if (distSupport <= 0.025 && distSupport >= 0) {
            score += 1;
            checklist.push({
                type: "bullish",
                label: `Giá tích lũy sát vùng Hỗ trợ cứng quanh ${formatMoney(sr.support)}đ`,
                score: 1
            });
        }
        if (distResist <= 0.025 && distResist >= 0) {
            score -= 1;
            checklist.push({
                type: "bearish",
                label: `Giá tiệm cận sát vùng Kháng cự cứng quanh ${formatMoney(sr.resistance)}đ`,
                score: -1
            });
        }

        // --- LỚP 4: NHẬN DIỆN SETUP QUY LUẬT DÒNG TIỀN KINH ĐIỂN (VSA/Wyckoff) ---
        // 1. Setup 1: Bẫy giảm giá (Spring) tại hỗ trợ cứng
        let isSpring = false;
        const todayLowerShadow = Math.min(today.open, today.close) - today.low;
        const todayBody = Math.abs(today.close - today.open) || 1;
        if (sr.support && today.low < sr.support && today.close >= sr.support * 0.99) {
            if (todayLowerShadow >= todayBody * 1.5 || (today.close > today.open && today.close >= today.low * 1.02)) {
                if (today.volume > avgVol * 1.1) {
                    isSpring = true;
                }
            }
        }

        // 2. Setup 2: Điểm mua breakout bùng nổ (Chỉ ghi nhận trong UPTREND trung hạn để lọc Bulltrap)
        let isBreakout = false;
        let max20Close = 0;
        for (let i = 1; i <= 20; i++) {
            const idx = latestIdx - i;
            if (idx >= 0 && processedData[idx].close > max20Close) {
                max20Close = processedData[idx].close;
            }
        }
        if (close > max20Close && vol > avgVol * 1.7) {
            if (isLongTermUptrend) {
                isBreakout = true;
            } else {
                checklist.push({
                    type: "neutral",
                    label: `Dòng tiền đột phá ngắn hạn nhưng xu hướng trung-dài hạn giảm (Bulltrap)`,
                    score: 0
                });
            }
        }

        // 3. Setup 3: Tích lũy nén chặt kiệt vol (VCP)
        let isVCP = false;
        let max15Price = 0;
        let min15Price = 99999999;
        for (let i = 0; i < 15; i++) {
            const idx = latestIdx - i;
            if (idx >= 0) {
                if (processedData[idx].close > max15Price) max15Price = processedData[idx].close;
                if (processedData[idx].close < min15Price) min15Price = processedData[idx].close;
            }
        }
        const spread15 = (max15Price - min15Price) / min15Price;
        let recent3Vol = 0;
        for (let i = 0; i < 3; i++) {
            recent3Vol += processedData[latestIdx - i].volume;
        }
        recent3Vol = recent3Vol / 3;

        if (spread15 <= 0.05 && recent3Vol < avgVol * 0.75) {
            isVCP = true;
        }

        // 4. Setup 4: Đà tăng Momentum gia tốc
        let isMomentumSurge = false;
        if (latestIdx >= 2) {
            const p0 = processedData[latestIdx - 2];
            const p1 = processedData[latestIdx - 1];
            const p2 = processedData[latestIdx];

            if (p2.close > p1.close && p1.close > p0.close &&
                p2.close > p2.open && p1.close > p1.open && p0.close > p0.open &&
                p2.volume > p1.volume && p1.volume > p0.volume && p2.volume > avgVol) {
                isMomentumSurge = true;
            }
        }

        // 5. Setup 5: Cá mập gom hàng (Smart Money Accumulation)
        let isSharkAccumulation = false;
        let smartBuyDays = 0;
        let smartSellDays = 0;
        for (let i = 0; i < 20; i++) {
            const idx = latestIdx - i;
            if (idx >= 0) {
                const p = processedData[idx];
                if (p.volume > avgVol * 1.25) {
                    if (p.changePct > 1.0) smartBuyDays++;
                    if (p.changePct < -1.0) smartSellDays++;
                }
            }
        }
        if (smartBuyDays >= 3 && smartBuyDays > smartSellDays) {
            isSharkAccumulation = true;
        }

        // Cộng điểm thưởng từ Setup phát hiện được vào hệ thống chấm điểm chung
        let setupTitle = "Chưa hình thành Setup rõ ràng";
        let setupIconHtml = `<i class="fa-solid fa-magnifying-glass-chart"></i>`;
        let oppValText = "30% (Thấp)";
        let oppPercent = 30;
        let oppClass = "neutral-low";
        let actionText = "ĐỨNG NGOÀI QUAN SÁT";
        let explanationText = `Cổ phiếu hiện tại đang vận động tích lũy tự nhiên và chưa có các dấu hiệu đột biến dòng tiền hay bẫy giá của cá mập. Khuyên nghị nhà đầu tư kiên nhẫn nắm giữ tiền mặt hoặc hàng có sẵn, chờ đợi tín hiệu dòng tiền kích hoạt quy luật tăng giá mới.`;

        if (isSpring) {
            score += 3;
            setupTitle = "Bẫy Giảm Giá & Rút Chân Gom Hàng (Bear Trap / Spring)";
            setupIconHtml = `<i class="fa-solid fa-anchor-lock"></i>`;
            oppValText = "90% (Rất Cao)";
            oppPercent = 90;
            oppClass = "very-high";
            actionText = "MUA MẠNH MẼ ĐÓN SÓNG";
            explanationText = `Quy luật Bear Trap kích hoạt khi giá cố tình đạp thủng vùng hỗ trợ cứng ${formatMoney(sr.support)}đ nhằm ép nhỏ lẻ cắt lỗ hoảng loạn. Ngay lập tức dòng tiền lớn nhập cuộc thu gom quyết liệt giúp giá rút chân mạnh mẽ với khối lượng lớn. Đây là quy luật gom hàng cướp cạn kinh điển, báo hiệu nhịp tăng mạnh sắp xảy ra.`;
            checklist.push({
                type: "bullish",
                label: `Quy luật Dòng tiền: Bear Trap tại hỗ trợ cứng`,
                score: 3
            });
        } else if (isBreakout) {
            score += 2.5;
            setupTitle = "Điểm Mua Đột Phá Nền Giá (Volume Breakout)";
            setupIconHtml = `<i class="fa-solid fa-bolt"></i>`;
            oppValText = "85% (Cao)";
            oppPercent = 85;
            oppClass = "high";
            actionText = "MUA BỨT PHÁ (BUY BREAKOUT)";
            explanationText = `Quy luật bứt phá xác nhận khi giá đóng cửa vượt đỉnh 20 phiên gần nhất (${formatMoney(max20Close)}đ) đi kèm khối lượng giao dịch bùng nổ (+${((vol/avgVol - 1)*100).toFixed(0)}% so với trung bình). Điều này cho thấy dòng tiền lớn quyết định đẩy giá qua khỏi vùng kháng cự. Đây là điểm mua bám đuổi xu hướng tăng (Trend Following) có độ tin cậy cao nhất.`;
            checklist.push({
                type: "bullish",
                label: `Quy luật Dòng tiền: Đột phá nền giá (Uptrend)`,
                score: 2.5
            });
        } else if (isVCP) {
            score += 2;
            setupTitle = "Tích Lũy Nền Phẳng Nén Chặt (VCP - Kiệt Nguồn Cung)";
            setupIconHtml = `<i class="fa-solid fa-compress"></i>`;
            oppValText = "75% (Khá Cao)";
            oppPercent = 75;
            oppClass = "high";
            actionText = "MUA GOM TÍCH LŨY (BUY ON BASE)";
            explanationText = `Quy luật Vắt kiệt nguồn cung (VCP) thể hiện qua biên độ dao động giá siêu nhỏ trong 15 phiên (${(spread15*100).toFixed(1)}%) đi kèm khối lượng giao dịch kiệt quệ (-${((1 - recent3Vol/avgVol)*100).toFixed(0)}% so với trung bình). Lực cung bán ra đã hoàn toàn bị triệt tiêu, cổ phiếu như lò xo nén chặt chỉ cần lực cầu nhẹ là bứt phá mạnh. Khuyên nghị mua gom tích lũy lấy vị thế ở nền giá này.`;
            checklist.push({
                type: "bullish",
                label: `Quy luật Dòng tiền: Tích lũy nén chặt kiệt vol (VCP)`,
                score: 2
            });
        } else if (isMomentumSurge) {
            score += 2;
            setupTitle = "Đà Tăng Gia Tốc Bứt Phá (Momentum Surge)";
            setupIconHtml = `<i class="fa-solid fa-arrow-trend-up"></i>`;
            oppValText = "80% (Cao)";
            oppPercent = 80;
            oppClass = "high";
            actionText = "MUA GIA TĂNG TỶ TRỌNG";
            explanationText = `Quy luật đà tăng mạnh mẽ (3 Chàng lính trắng) xuất hiện với 3 phiên tăng liên tiếp, giá đóng cửa tăng dần đi kèm khối lượng tăng dần đều qua từng phiên. Điều này chứng minh dòng tiền cuồn cuộn đổ vào đẩy giá đi lên bất chấp. Xung lực tăng rất mạnh, khuyên nghị mua gia tăng vị thế hoặc mua bám đuổi sóng ngắn hạn.`;
            checklist.push({
                type: "bullish",
                label: `Quy luật Dòng tiền: Đà tăng Momentum gia tốc`,
                score: 2
            });
        } else if (isSharkAccumulation) {
            score += 1.5;
            setupTitle = "Dấu Chân Cá Mập Gom Hàng (Smart Money Accumulation)";
            setupIconHtml = `<i class="fa-solid fa-fish-fins"></i>`;
            oppValText = "70% (Khá Cao)";
            oppPercent = 70;
            oppClass = "high";
            actionText = "MUA TÍCH LŨY CÙNG CÁ MẠP";
            explanationText = `Thuật toán phát hiện dòng tiền thông minh của tổ chức âm thầm thu gom hàng trong 20 phiên qua. Biểu hiện qua số phiên tăng vol lớn chủ đạo chiếm ưu thế so với các phiên giảm vol lớn, đồng thời giá không bị kéo tăng quá mạnh nhằm tránh sự chú ý. Đây là cơ hội mua tích lũy an toàn cùng giá vốn của cá mập.`;
            checklist.push({
                type: "bullish",
                label: `Quy luật Dòng tiền: Cá mập gom hàng âm thầm`,
                score: 1.5
            });
        }

        // Giới hạn điểm số định lượng cuối cùng trong [-10, 10]
        const finalScore = Math.max(-10, Math.min(10, Math.round(score * 2) / 2));
        
        let signalText = "THEO DÕI";
        let signalClass = "neutral";
        let confidence = "55%";
        let buyZone = "--";
        let target = "--";
        let stopLoss = "--";
        let explanation = "";

        if (finalScore >= 6) {
            signalText = "MUA MẠNH";
            signalClass = "buy";
            confidence = `${80 + Math.min(20, (finalScore - 6) * 5)}%`;
            buyZone = `${formatMoney(Math.round(close * 0.98))} - ${formatMoney(Math.round(close * 1.015))} đ`;
            target = sr.resistance ? `${formatMoney(sr.resistance)} đ (Kháng cự)` : `${formatMoney(Math.round(close * 1.12))} đ (+12%)`;
            stopLoss = sr.support ? `${formatMoney(Math.round(sr.support * 0.975))} đ` : `${formatMoney(Math.round(close * 0.94))} đ (-6%)`;
            
            explanation = `Hệ thống Phân tích Định lượng & Dòng tiền cho kết quả đồng thuận tăng cực kỳ mạnh mẽ đạt <strong>+${finalScore >= 0 ? '+' : ''}${finalScore} điểm</strong>. Cổ phiếu đang có sự hỗ trợ của xu hướng lớn dài hạn vững chắc và xuất hiện các setup dòng tiền đáng tin cậy. Khuyên nghị hành động chiến thuật: <strong>${actionText}</strong>.`;
        } else if (finalScore >= 2) {
            signalText = "MUA";
            signalClass = "buy";
            confidence = `${65 + (finalScore - 2) * 5}%`;
            buyZone = `${formatMoney(Math.round(close * 0.975))} - ${formatMoney(Math.round(close * 1.005))} đ`;
            target = sr.resistance ? `${formatMoney(sr.resistance)} đ` : `${formatMoney(Math.round(close * 1.08))} đ (+8%)`;
            stopLoss = sr.support ? `${formatMoney(Math.round(sr.support * 0.975))} đ` : `${formatMoney(Math.round(close * 0.94))} đ (-6%)`;
            
            if (isLongTermUptrend) {
                explanation = `Hệ thống chấm điểm đạt mức tích cực <strong>+${finalScore} điểm</strong>. Cổ phiếu đang vận động trong xu hướng tăng lớn ổn định, các nhịp điều chỉnh rung lắc ngắn hạn là cơ hội tốt để tích lũy hàng giá đỏ. Khuyên nghị hành động chiến thuật: <strong>${actionText}</strong>.`;
            } else {
                explanation = `Hệ thống chấm điểm đạt <strong>+${finalScore} điểm</strong>, xu hướng đang cải thiện dần từ vùng tích lũy đáy. Khuyên nghị nhà đầu tư mở vị thế mua gom thăm dò từng phần. Khuyên nghị hành động chiến thuật: <strong>${actionText}</strong>.`;
            }
        } else if (finalScore <= -6) {
            signalText = "BÁN MẠNH";
            signalClass = "sell";
            confidence = `${80 + Math.min(20, (-finalScore - 6) * 5)}%`;
            buyZone = "Đứng ngoài hoàn toàn";
            target = "Thu hồi tiền mặt";
            stopLoss = "Hạ tỷ trọng / Bán hết";
            actionText = "BÁN HẠ TỶ TRỌNG TỐI ĐA";
            
            explanation = `Hệ thống cảnh báo tiêu cực mức độ cao đạt <strong>${finalScore} điểm</strong>. Cổ phiếu bị gãy các mốc hỗ trợ cấu trúc trung hạn quan trọng trong khi EMA50 đang dốc xuống mạnh. Tuyệt đối không bắt đáy cảm tính. Khuyên nghị hành động chiến thuật: <strong>${actionText}</strong>.`;
        } else if (finalScore <= -2) {
            signalText = "BÁN";
            signalClass = "sell";
            confidence = `${65 + (-finalScore - 2) * 5}%`;
            buyZone = "Hạn chế mua mới";
            target = "Chờ tích lũy lại";
            stopLoss = "Bán hạ tỷ trọng";
            actionText = "HẠ TỶ TRỌNG CƠ CẤU";
            
            explanation = `Hệ thống ghi nhận điểm số yếu <strong>${finalScore} điểm</strong>. Cổ phiếu có dấu hiệu suy thoái dưới đường EMA20 và cấu trúc dài hạn đang xấu đi rõ rệt. Cần chủ động cơ cấu danh mục để bảo vệ vốn. Khuyên nghị hành động chiến thuật: <strong>${actionText}</strong>.`;
        } else {
            signalText = "THEO DÕI";
            signalClass = "neutral";
            confidence = "55%";
            buyZone = sr.support ? `${formatMoney(Math.round(sr.support * 1.005))} - ${formatMoney(Math.round(sr.support * 1.025))} đ` : "Tích lũy quanh hỗ trợ";
            target = `${formatMoney(Math.round(close * 1.05))} đ (+5%)`;
            stopLoss = `${formatMoney(Math.round(close * 0.95))} đ (-5%)`;
            actionText = "TẠM THỜI QUAN SÁT";
            
            explanation = `Điểm số định lượng ở trạng thái trung tính <strong>${finalScore >= 0 ? '+' : ''}${finalScore} điểm</strong>. Các chỉ báo và dòng tiền đang giằng co chưa có xu hướng bứt phá rõ nét. Khuyên nghị nhà đầu tư tạm thời nắm giữ tỷ trọng an toàn và kiên nhẫn quan sát. Khuyên nghị hành động chiến thuật: <strong>${actionText}</strong>.`;
        }

        // Cập nhật UI Card AI Signal
        mainSignalBadge.textContent = signalText;
        mainSignalBadge.className = `signal-value-badge ${signalClass}`;
        
        const signalScore = document.getElementById("signal-score");
        if (signalScore) {
            signalScore.innerHTML = `<span class="${finalScore >= 0 ? 'text-success' : 'text-danger'}">${finalScore >= 0 ? '+' : ''}${finalScore}</span> / 10`;
        }

        signalConfidence.textContent = confidence;
        signalBuyZone.textContent = buyZone;
        signalTarget.textContent = target;
        signalStopLoss.textContent = stopLoss;
        signalExplanation.innerHTML = explanation;

        // Cập nhật UI Card Setup Dòng Tiền (Thống nhất khuyến nghị)
        if (setupName) setupName.textContent = setupTitle;
        if (setupIcon) setupIcon.innerHTML = setupIconHtml;
        if (opportunityValue) opportunityValue.textContent = oppValText;
        if (setupAction) setupAction.textContent = actionText;
        if (setupExplanation) setupExplanation.innerHTML = explanationText;
        if (opportunityBar) {
            opportunityBar.className = `opportunity-bar-fill ${oppClass}`;
            opportunityBar.style.width = `${oppPercent}%`;
        }

        // Render checklist HTML
        if (checklistItems) {
            checklistItems.innerHTML = "";
            checklist.forEach(item => {
                const li = document.createElement("li");
                li.className = item.type;
                
                let iconClass = "fa-solid fa-circle-minus";
                if (item.type === "bullish") iconClass = "fa-solid fa-circle-check";
                if (item.type === "bearish") iconClass = "fa-solid fa-triangle-exclamation";
                
                li.innerHTML = `
                    <span class="check-label"><i class="${iconClass}"></i> ${item.label}</span>
                    <span class="check-score">${item.score}</span>
                `;
                checklistItems.appendChild(li);
            });
        }
    }

    function initChart() {
        const container = document.getElementById("chart-container");
        container.innerHTML = "";

        try {
            const chartOptions = {
                width: container.clientWidth || 800,
                height: 400,
                layout: {
                    textColor: '#9ca3af',
                    background: { type: 'solid', color: '#181d2c' },
                },
                grid: {
                    vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
                    horzLines: { color: 'rgba(255, 255, 255, 0.04)' },
                },
                crosshair: {
                    mode: LightweightCharts.CrosshairMode.Normal,
                },
                rightPriceScale: {
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                },
                timeScale: {
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                    timeVisible: false,
                    secondsVisible: false,
                },
            };

            chartInstance = LightweightCharts.createChart(container, chartOptions);

            candlestickSeries = chartInstance.addSeries(LightweightCharts.CandlestickSeries, {
                upColor: '#10b981',
                downColor: '#ef4444',
                borderVisible: false,
                wickUpColor: '#10b981',
                wickDownColor: '#ef4444',
            });

            smaSeries = chartInstance.addSeries(LightweightCharts.LineSeries, {
                color: '#3b82f6',
                lineWidth: 2,
                title: 'SMA (20)',
            });

            ema50Series = chartInstance.addSeries(LightweightCharts.LineSeries, {
                color: '#8b5cf6',
                lineWidth: 2,
                title: 'EMA (50)',
            });

            bollingerUpperSeries = chartInstance.addSeries(LightweightCharts.LineSeries, {
                color: 'rgba(255, 255, 255, 0.25)',
                lineWidth: 1,
                title: 'BB Upper',
                lineStyle: LightweightCharts.LineStyle.Dashed,
            });

            bollingerLowerSeries = chartInstance.addSeries(LightweightCharts.LineSeries, {
                color: 'rgba(255, 255, 255, 0.25)',
                lineWidth: 1,
                title: 'BB Lower',
                lineStyle: LightweightCharts.LineStyle.Dashed,
            });

            // 1. Thêm Volume Series ở đáy biểu đồ
            volumeSeries = chartInstance.addSeries(LightweightCharts.HistogramSeries, {
                color: 'rgba(38, 166, 154, 0.35)', // màu xanh teal mờ
                priceFormat: {
                    type: 'volume',
                },
                priceScaleId: 'volume',
            });



            // 3. Thêm Series Dự báo Thanh khoản T+5 (Cột Histogram Cam mờ)
            forecastVolumeSeries = chartInstance.addSeries(LightweightCharts.HistogramSeries, {
                color: 'rgba(245, 158, 11, 0.4)',
                priceFormat: {
                    type: 'volume',
                },
                priceScaleId: 'volume',
            });

            // Cấu hình scale cho Volume nằm ở đáy
            chartInstance.priceScale('volume').applyOptions({
                scaleMargins: {
                    top: 0.85, // Chỉ chiếm 15% đáy biểu đồ nến
                    bottom: 0,
                },
            });

            updateChartData();
            chartInstance.timeScale().fitContent();
            resizeChart();
            window.addEventListener('resize', resizeChart);
        } catch (e) {
            console.error("Lỗi vẽ biểu đồ:", e);
            container.innerHTML = `<div style="color: #ef4444; padding: 20px; font-family: sans-serif; text-align: center; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px;">
                <strong>Lỗi vẽ biểu đồ:</strong> ${e.message} <br>
                <small style="color: #9ca3af; display: block; margin-top: 10px;">${e.stack ? e.stack.split('\n')[0] : ''}</small>
            </div>`;
        }
    }

    function resizeChart() {
        if (!chartInstance) return;
        const container = document.getElementById("chart-container");
        chartInstance.applyOptions({
            width: container.clientWidth,
            height: 400
        });
    }

    function updateChartData() {
        if (!candlestickSeries || !smaSeries) return;

        let filteredData = [...processedData];
        const latestIdx = filteredData.length;

        if (chartDays === "90") {
            filteredData = filteredData.slice(Math.max(0, latestIdx - 90));
        } else if (chartDays === "30") {
            filteredData = filteredData.slice(Math.max(0, latestIdx - 30));
        }

        const candleData = filteredData.map(d => ({
            time: d.chartDate,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close
        }));

        const smaData = filteredData
            .filter(d => d.sma20 !== null)
            .map(d => ({
                time: d.chartDate,
                value: d.sma20
            }));

        const ema50Data = filteredData
            .filter(d => d.ema50 !== null && d.ema50 !== undefined)
            .map(d => ({
                time: d.chartDate,
                value: d.ema50
            }));

        const bbUpperData = filteredData
            .filter(d => d.bbUpper !== null && d.bbUpper !== undefined)
            .map(d => ({
                time: d.chartDate,
                value: d.bbUpper
            }));

        const bbLowerData = filteredData
            .filter(d => d.bbLower !== null && d.bbLower !== undefined)
            .map(d => ({
                time: d.chartDate,
                value: d.bbLower
            }));

        // Khối lượng thực tế
        const volumeData = filteredData.map(d => ({
            time: d.chartDate,
            value: d.volume,
            color: d.close >= d.open ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'
        }));

        // Dự báo T+5
        const lastRealData = filteredData[filteredData.length - 1];
        let forecastVolumeData = [];

        if (lastRealData && processedData.length >= 10) {
            const futureDates = getNextBusinessDays(lastRealData.chartDate, 5);
            const volumeForecastVals = calculateHoltForecast(processedData, 'volume', 5);

            for (let i = 0; i < 5; i++) {
                forecastVolumeData.push({
                    time: futureDates[i],
                    value: volumeForecastVals[i]
                });
            }
        }

        candlestickSeries.setData(candleData);
        smaSeries.setData(smaData);
        if (ema50Series) ema50Series.setData(ema50Data);
        if (bollingerUpperSeries) bollingerUpperSeries.setData(bbUpperData);
        if (bollingerLowerSeries) bollingerLowerSeries.setData(bbLowerData);
        
        if (volumeSeries) volumeSeries.setData(volumeData);
        if (forecastVolumeSeries) forecastVolumeSeries.setData(forecastVolumeData);
    }

    document.querySelectorAll(".chart-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            document.querySelectorAll(".chart-btn").forEach(x => x.classList.remove("active"));
            e.target.classList.add("active");
            chartDays = e.target.getAttribute("data-days");
            updateChartData();
            if (chartInstance) {
                chartInstance.timeScale().fitContent();
            }
        });
    });

    function updateRecentTable() {
        recentTable.innerHTML = "";
        const limitData = rawData.slice(0, 10);
        
        limitData.forEach(d => {
            const row = document.createElement("tr");
            const isUp = d.change >= 0;
            
            row.innerHTML = `
                <td>${d.dateStr}</td>
                <td>${formatMoney(d.open)}</td>
                <td>${formatMoney(d.high)}</td>
                <td>${formatMoney(d.low)}</td>
                <td>${formatMoney(d.close)}</td>
                <td class="${isUp ? 'up' : 'down'}">${isUp ? '+' : ''}${d.changePct.toFixed(2)}%</td>
                <td>${formatMoney(d.volume)}</td>
                <td>${formatMoney(d.value)}</td>
            `;
            recentTable.appendChild(row);
        });
    }

    function updateHistoryTable() {
        renderHistoryRows(rawData);
    }

    function renderHistoryRows(dataToRender) {
        allHistoryTable.innerHTML = "";
        
        if (dataToRender.length === 0) {
            allHistoryTable.innerHTML = `<tr><td colspan="9" class="text-center">Không tìm thấy kết quả nào.</td></tr>`;
            return;
        }

        dataToRender.forEach(d => {
            const row = document.createElement("tr");
            const isUp = d.change >= 0;
            
            row.innerHTML = `
                <td>${d.dateStr}</td>
                <td>${formatMoney(d.ref)}</td>
                <td>${formatMoney(d.open)}</td>
                <td>${formatMoney(d.close)}</td>
                <td>${formatMoney(d.high)}</td>
                <td>${formatMoney(d.low)}</td>
                <td class="${isUp ? 'up' : 'down'}">${isUp ? '+' : ''}${formatMoney(d.change)} (${isUp ? '+' : ''}${d.changePct.toFixed(2)}%)</td>
                <td>${formatMoney(d.volume)}</td>
                <td>${formatMoney(d.value)}</td>
            `;
            allHistoryTable.appendChild(row);
        });
    }

    searchDateInput.addEventListener("input", (e) => {
        const val = e.target.value.trim().toLowerCase();
        if (!val) {
            renderHistoryRows(rawData);
            return;
        }
        const filtered = rawData.filter(d => d.dateStr.includes(val));
        renderHistoryRows(filtered);
    });

    function updateSignalsView() {
        const latest = rawData[0];
        if (!latest) return;

        // 1. SMA Details
        if (latest.sma20) {
            if (latest.close > latest.sma20) {
                indicatorSmaStatus.textContent = "BULLISH (TĂNG)";
                indicatorSmaStatus.className = "matrix-status bullish";
                indicatorSmaDesc.innerHTML = `Giá đóng cửa (<strong>${formatMoney(latest.close)} đ</strong>) hiện tại nằm TRÊN đường SMA(20) (<strong>${formatMoney(Math.round(latest.sma20))} đ</strong>), biểu thị xu hướng ngắn hạn đang chuyển dịch tích cực.`;
            } else {
                indicatorSmaStatus.textContent = "BEARISH (GIẢM)";
                indicatorSmaStatus.className = "matrix-status bearish";
                indicatorSmaDesc.innerHTML = `Giá đóng cửa (<strong>${formatMoney(latest.close)} đ</strong>) hiện tại nằm DƯỚI đường SMA(20) (<strong>${formatMoney(Math.round(latest.sma20))} đ</strong>), biểu thị xu hướng ngắn hạn đang có sự suy yếu.`;
            }
        }

        // 2. EMA Details
        if (latest.ema20 && latest.ema50 && indicatorEmaStatus && indicatorEmaDesc) {
            if (latest.close > latest.ema20 && latest.ema20 > latest.ema50) {
                indicatorEmaStatus.textContent = "BULLISH (TĂNG MẠNH)";
                indicatorEmaStatus.className = "matrix-status bullish";
                indicatorEmaDesc.innerHTML = `Giá đóng cửa nằm trên đường EMA20 (<strong>${formatMoney(Math.round(latest.ema20))} đ</strong>) và đường EMA20 nằm trên EMA50 (<strong>${formatMoney(Math.round(latest.ema50))} đ</strong>). Cấu trúc xu hướng tăng giá trung hạn lành mạnh.`;
            } else if (latest.close < latest.ema20 && latest.ema20 < latest.ema50) {
                indicatorEmaStatus.textContent = "BEARISH (GIẢM MẠNH)";
                indicatorEmaStatus.className = "matrix-status bearish";
                indicatorEmaDesc.innerHTML = `Giá đóng cửa nằm dưới đường EMA20 (<strong>${formatMoney(Math.round(latest.ema20))} đ</strong>) và đường EMA20 nằm dưới EMA50 (<strong>${formatMoney(Math.round(latest.ema50))} đ</strong>). Cấu trúc giảm giá đang kiểm soát xu thế trung hạn.`;
            } else if (latest.close > latest.ema20 && latest.ema20 <= latest.ema50) {
                indicatorEmaStatus.textContent = "RECOVERY (HỒI PHỤC)";
                indicatorEmaStatus.className = "matrix-status bullish";
                indicatorEmaDesc.innerHTML = `Giá phục hồi vượt trên EMA20 (<strong>${formatMoney(Math.round(latest.ema20))} đ</strong>) nhưng xu hướng trung hạn EMA50 (<strong>${formatMoney(Math.round(latest.ema50))} đ</strong>) vẫn đang dốc xuống.`;
            } else {
                indicatorEmaStatus.textContent = "WEAKENING (SUY YẾU)";
                indicatorEmaStatus.className = "matrix-status bearish";
                indicatorEmaDesc.innerHTML = `Giá giảm dưới EMA20 (<strong>${formatMoney(Math.round(latest.ema20))} đ</strong>) báo hiệu suy yếu ngắn hạn, nhưng EMA50 (<strong>${formatMoney(Math.round(latest.ema50))} đ</strong>) phía dưới vẫn đóng vai trò hỗ trợ.`;
            }
        }

        // 3. RSI Details
        if (latest.rsi14) {
            const rsi = latest.rsi14;
            if (rsi > 70) {
                indicatorRsiStatus.textContent = "OVERBOUGHT (QUÁ MUA)";
                indicatorRsiStatus.className = "matrix-status bearish";
                indicatorRsiDesc.innerHTML = `Chỉ số RSI(14) đạt mức <strong>${rsi.toFixed(2)}</strong>. Thị trường đang trong trạng thái FOMO cao độ, dòng tiền mua đuổi mạnh nhưng cảnh báo rủi ro rung lắc hoặc đảo chiều đang cận kề.`;
            } else if (rsi < 30) {
                indicatorRsiStatus.textContent = "OVERSOLD (QUÁ BÁN)";
                indicatorRsiStatus.className = "matrix-status bullish";
                indicatorRsiDesc.innerHTML = `Chỉ số RSI(14) sụt giảm về <strong>${rsi.toFixed(2)}</strong>. Lực bán tháo kéo giá xuống vùng cực đoan, mở ra cơ hội giải ngân thăm dò cho các nhịp sóng hồi phục ngắn hạn.`;
            } else {
                indicatorRsiStatus.textContent = "NEUTRAL (TRUNG LẬP)";
                indicatorRsiStatus.className = "matrix-status neutral";
                indicatorRsiDesc.innerHTML = `Chỉ số RSI(14) đang dao động quanh mức <strong>${rsi.toFixed(2)}</strong>. Lực mua và bán đang ở thế giằng co cân bằng, xu hướng tiếp theo cần chờ đột phá giá.`;
            }
        }

        // 4. MACD Details
        if (latest.macd !== undefined && latest.macdSignal !== undefined && indicatorMacdStatus && indicatorMacdDesc) {
            const hist = latest.macdHist || 0;
            if (hist > 0) {
                indicatorMacdStatus.textContent = "BULLISH (TÍCH CỰC)";
                indicatorMacdStatus.className = "matrix-status bullish";
                indicatorMacdDesc.innerHTML = `Đường MACD (<strong>${latest.macd.toFixed(2)}</strong>) nằm trên đường Tín hiệu (<strong>${latest.macdSignal.toFixed(2)}</strong>) với Histogram dương (<strong>${hist.toFixed(2)}</strong>). Động lượng tăng trưởng đang chiếm thế chủ động.`;
            } else {
                indicatorMacdStatus.textContent = "BEARISH (TIÊU CỰC)";
                indicatorMacdStatus.className = "matrix-status bearish";
                indicatorMacdDesc.innerHTML = `Đường MACD (<strong>${latest.macd.toFixed(2)}</strong>) nằm dưới đường Tín hiệu (<strong>${latest.macdSignal.toFixed(2)}</strong>) với Histogram âm (<strong>${hist.toFixed(2)}</strong>). Áp lực điều chỉnh ngắn hạn đang dâng cao.`;
            }
        }

        // 5. Volume Details
        let avgVol = 0;
        for (let i = 0; i < Math.min(20, rawData.length); i++) {
            avgVol += rawData[i].volume;
        }
        avgVol = avgVol / Math.min(20, rawData.length);
        
        const volRatio = latest.volume / avgVol;

        if (volRatio >= 1.3) {
            indicatorVolStatus.textContent = "VOLUME BREAKOUT (BÙNG NỔ)";
            indicatorVolStatus.className = "matrix-status bullish";
            indicatorVolDesc.innerHTML = `Khối lượng khớp hôm nay (<strong>${formatVolume(latest.volume)}</strong>) cao hơn hẳn trung bình 20 phiên trước đó (<strong>${formatVolume(Math.round(avgVol))}</strong>), tăng trưởng <strong>${((volRatio - 1)*100).toFixed(0)}%</strong>. Xác nhận sự tham gia mạnh mẽ của dòng tiền lớn.`;
        } else {
            indicatorVolStatus.textContent = "NORMAL (TRUNG BÌNH)";
            indicatorVolStatus.className = "matrix-status neutral";
            indicatorVolDesc.innerHTML = `Khối lượng khớp đạt <strong>${formatVolume(latest.volume)}</strong>, xấp xỉ mức trung bình 20 phiên qua (<strong>${formatVolume(Math.round(avgVol))}</strong>). Dòng tiền hoạt động ổn định, chưa có dấu hiệu đột biến rõ nét.`;
        }

        // 6. Support & Resistance Details
        const sr = calculateSupportResistance();
        if (sr.support && sr.resistance && indicatorSrStatus && indicatorSrDesc) {
            const distSupport = ((latest.close - sr.support) / sr.support * 100).toFixed(1);
            const distResist = ((sr.resistance - latest.close) / latest.close * 100).toFixed(1);
            
            indicatorSrStatus.textContent = "ACTIVE (KÊNH GIÁ ĐỘNG)";
            indicatorSrStatus.className = "matrix-status neutral";
            indicatorSrDesc.innerHTML = `Mức hỗ trợ cứng gần nhất: <strong>${formatMoney(sr.support)} đ</strong> (cách <strong>${distSupport}%</strong>). Mức kháng cự cứng gần nhất: <strong>${formatMoney(sr.resistance)} đ</strong> (cách <strong>${distResist}%</strong>). Giá đang dịch chuyển tích lũy trong biên độ này.`;
        }
    }

    // Search handler for Ticker symbol
    function handleTickerSearch() {
        const val = tickerInput.value.trim().toUpperCase();
        if (!val) return;
        
        currentTicker = val;
        loadData();
    }

    if (btnSearchTicker) {
        btnSearchTicker.addEventListener("click", handleTickerSearch);
    }
    if (tickerInput) {
        tickerInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                handleTickerSearch();
            }
        });
    }

    // --- LOGIC XUẤT ẢNH TIKTOK 1:1 (4K) ---
    const btnExportTiktok = document.getElementById("btn-export-tiktok");
    const tiktokModal = document.getElementById("tiktok-modal");
    const closeTiktokModal = document.getElementById("close-tiktok-modal");
    const btnDownloadTiktok4k = document.getElementById("btn-download-tiktok-4k");

    // Đóng mở modal
    if (btnExportTiktok) {
        btnExportTiktok.addEventListener("click", () => {
            prepareTiktokExportData();
        });
    }

    if (closeTiktokModal) {
        closeTiktokModal.addEventListener("click", () => {
            if (tiktokModal) {
                tiktokModal.classList.add("hidden");
                document.body.style.overflow = ""; // Khôi phục cuộn trang chính
            }
        });
    }

    // Đóng modal khi click ra ngoài container
    if (tiktokModal) {
        tiktokModal.addEventListener("click", (e) => {
            if (e.target === tiktokModal) {
                tiktokModal.classList.add("hidden");
                document.body.style.overflow = ""; // Khôi phục cuộn trang chính
            }
        });
    }

    function prepareTiktokExportData() {
        if (!rawData || rawData.length === 0) {
            alert("Không có dữ liệu để xuất ảnh. Vui lòng tải dữ liệu trước!");
            return;
        }

        const latest = rawData[0]; // Ngày gần nhất
        if (!latest) return;

        // 1. Đồng bộ thông tin cơ bản
        document.getElementById("export-ticker").textContent = currentTicker || "VIX";
        document.getElementById("export-date").textContent = latest.dateStr || new Date().toLocaleDateString('vi-VN');

        // 2. Đồng bộ các chỉ số KPI
        const exportClose = document.getElementById("export-kpi-close");
        const exportChange = document.getElementById("export-kpi-change");
        const exportScore = document.getElementById("export-kpi-score");
        const exportConfidence = document.getElementById("export-kpi-confidence");

        exportClose.textContent = formatMoney(latest.close) + " đ";
        
        const isUp = latest.change >= 0;
        exportChange.textContent = `${isUp ? '+' : ''}${latest.changePct.toFixed(2)}%`;
        exportChange.className = `kpi-change ${isUp ? 'up' : 'down'}`;

        // Lấy điểm số từ UI chính (để đảm bảo đồng bộ)
        const mainSignalBadge = document.getElementById("main-signal-badge");
        const signalScoreText = document.getElementById("signal-score") ? document.getElementById("signal-score").innerText : "--";
        const confidenceText = document.getElementById("signal-confidence") ? document.getElementById("signal-confidence").textContent : "--";
        const buyZoneText = document.getElementById("signal-buy-zone") ? document.getElementById("signal-buy-zone").textContent : "--";
        const targetText = document.getElementById("signal-target") ? document.getElementById("signal-target").textContent : "--";
        const stopLossText = document.getElementById("signal-stop-loss") ? document.getElementById("signal-stop-loss").textContent : "--";

        exportScore.innerHTML = signalScoreText;
        exportConfidence.textContent = confidenceText;

        // 3. Đồng bộ Panel Tín hiệu Chiến thuật
        const exportSignalBadge = document.getElementById("export-signal-badge");
        const exportBuyZone = document.getElementById("export-buy-zone");
        const exportTarget = document.getElementById("export-target");
        const exportStopLoss = document.getElementById("export-stop-loss");

        if (mainSignalBadge) {
            exportSignalBadge.textContent = mainSignalBadge.textContent;
            // Xác định class màu sắc cho badge tín hiệu
            exportSignalBadge.className = "export-signal-badge";
            if (mainSignalBadge.classList.contains("buy")) {
                exportSignalBadge.classList.add("buy");
            } else if (mainSignalBadge.classList.contains("sell")) {
                exportSignalBadge.classList.add("sell");
            } else {
                exportSignalBadge.classList.add("neutral");
            }
        }

        exportBuyZone.textContent = buyZoneText;
        exportTarget.textContent = targetText;
        exportStopLoss.textContent = stopLossText;
        
        // Đồng bộ màu cho chữ mục tiêu/cắt lỗ
        exportTarget.className = "text-success";
        exportStopLoss.className = "text-danger";

        // 4. Đồng bộ Panel Quy luật dòng tiền
        const setupNameText = document.getElementById("setup-name") ? document.getElementById("setup-name").textContent : "--";
        const oppValueText = document.getElementById("opportunity-value") ? document.getElementById("opportunity-value").textContent : "--";
        const oppBarMain = document.getElementById("opportunity-bar");
        const actionTextVal = document.getElementById("setup-action") ? document.getElementById("setup-action").textContent : "--";
        const explanationTextVal = document.getElementById("setup-explanation") ? document.getElementById("setup-explanation").innerHTML : "--";

        document.getElementById("export-setup-name").textContent = setupNameText;
        document.getElementById("export-opp-value").textContent = oppValueText;
        document.getElementById("export-action").textContent = actionTextVal;
        
        const exportOppBar = document.getElementById("export-opp-bar");
        if (exportOppBar && oppBarMain) {
            exportOppBar.style.width = oppBarMain.style.width;
        }

        // 5. Đồng bộ giải thích lý do khuyến nghị
        const mainExplanation = document.getElementById("signal-explanation") ? document.getElementById("signal-explanation").innerHTML : "";
        document.getElementById("export-explanation").innerHTML = mainExplanation;

        // 6. Chụp ảnh biểu đồ và nhét vào khung export
        const chartContainer = document.getElementById("chart-container");
        const exportChartImg = document.getElementById("export-chart-img");
        
        if (chartContainer && exportChartImg) {
            // Hiển thị trạng thái ảnh đang tải
            exportChartImg.src = "";
            exportChartImg.alt = "Đang kết xuất biểu đồ...";

            // Chụp biểu đồ bằng html2canvas
            html2canvas(chartContainer, {
                useCORS: true,
                backgroundColor: '#181d2c',
                logging: false
            }).then(canvas => {
                exportChartImg.src = canvas.toDataURL("image/png");
                exportChartImg.alt = "Biểu đồ phân tích kỹ thuật";
                
                // Mở modal sau khi biểu đồ được chụp xong
                if (tiktokModal) {
                    tiktokModal.classList.remove("hidden");
                    document.body.style.overflow = "hidden"; // Khóa cuộn trang chính khi mở modal xem trước
                }
            }).catch(err => {
                console.error("Lỗi chụp biểu đồ:", err);
                alert("Không thể chụp ảnh biểu đồ. Vui lòng thử lại!");
            });
        }
    }

    if (btnDownloadTiktok4k) {
        btnDownloadTiktok4k.addEventListener("click", () => {
            exportTiktok4KImage();
        });
    }

    function exportTiktok4KImage() {
        const node = document.getElementById("tiktok-export-node");
        if (!node) return;

        // Lưu trạng thái nguyên bản
        const originalTransform = node.style.transform;
        const originalPosition = node.style.position;
        const originalTop = node.style.top;
        const originalLeft = node.style.left;
        const originalZIndex = node.style.zIndex;

        // Đưa node ra ngoài màn hình và gỡ scale transform để html2canvas chụp đúng kích thước thực 1080x1080
        node.style.transform = "none";
        node.style.position = "fixed";
        node.style.top = "0";
        node.style.left = "0";
        node.style.zIndex = "99999";

        // Cập nhật text nút sang trạng thái đang xuất
        const originalBtnText = btnDownloadTiktok4k.innerHTML;
        btnDownloadTiktok4k.disabled = true;
        btnDownloadTiktok4k.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý ảnh 4K (Vui lòng đợi)...`;

        // Đợi 200ms để trình duyệt cập nhật layout trước khi chụp
        setTimeout(() => {
            html2canvas(node, {
                scale: 3.55555, // Để từ 1080px nhân lên thành ~3840px (Chất lượng 4K)
                useCORS: true,
                logging: false,
                backgroundColor: null // Giữ nền trong suốt cho các phần ngoài bo góc
            }).then(canvas => {
                // Tạo link tải ảnh
                const link = document.createElement("a");
                const ticker = currentTicker || "VIX";
                
                // Ngày định dạng DD-MM-YYYY
                const latest = rawData[0];
                const dateStr = latest ? latest.dateStr.replace(/\//g, "-") : new Date().toLocaleDateString('vi-VN').replace(/\//g, "-");
                
                link.download = `[HongKinhTe]_${ticker}_${dateStr}_1x1_4K.png`;
                link.href = canvas.toDataURL("image/png");
                link.click();

                // Khôi phục trạng thái nút bấm
                btnDownloadTiktok4k.disabled = false;
                btnDownloadTiktok4k.innerHTML = originalBtnText;

                // Khôi phục trạng thái node DOM cũ
                node.style.transform = originalTransform;
                node.style.position = originalPosition;
                node.style.top = originalTop;
                node.style.left = originalLeft;
                node.style.zIndex = originalZIndex;
            }).catch(err => {
                console.error("Lỗi xuất ảnh 4K:", err);
                alert("Lỗi xuất ảnh 4K: " + err.message);

                btnDownloadTiktok4k.disabled = false;
                btnDownloadTiktok4k.innerHTML = originalBtnText;

                node.style.transform = originalTransform;
                node.style.position = originalPosition;
                node.style.top = originalTop;
                node.style.left = originalLeft;
                node.style.zIndex = originalZIndex;
            });
        }, 200);
    }
});
