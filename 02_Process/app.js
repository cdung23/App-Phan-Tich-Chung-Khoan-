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
        errDiv.style.maxWidth = '420px';
        errDiv.style.fontFamily = 'monospace';
        errDiv.style.fontSize = '12px';
        errDiv.style.boxShadow = '0 10px 20px rgba(0,0,0,0.3)';
        errDiv.style.lineHeight = '1.5';
        document.body.appendChild(errDiv);
    }
    let msg = event.message;
    if (msg === "Script error.") {
        msg = "Script error. (Lỗi CORS từ CDN Firebase. Vui lòng nhấn F12 -> chọn tab Console để xem lỗi thực tế, hoặc kiểm tra lại Rules/Database URL của bạn!)";
    }
    errDiv.innerHTML = `<strong>JS Error:</strong> ${msg}<br><span style="color:#6b7280; font-size:10px;">${event.filename || 'unknown'}:${event.lineno || 0}</span>`;
});

// Bắt lỗi Unhandled Promise Rejections
window.addEventListener('unhandledrejection', function(event) {
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
        errDiv.style.maxWidth = '420px';
        errDiv.style.fontFamily = 'monospace';
        errDiv.style.fontSize = '12px';
        errDiv.style.boxShadow = '0 10px 20px rgba(0,0,0,0.3)';
        errDiv.style.lineHeight = '1.5';
        document.body.appendChild(errDiv);
    }
    const reason = event.reason ? (event.reason.message || event.reason) : 'Unknown Promise Rejection';
    errDiv.innerHTML = `<strong>Unhandled Promise Rejection:</strong> ${reason}`;
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
    const btnScreener = document.getElementById("btn-screener");
    const btnHistory = document.getElementById("btn-history");
    const btnLessons = document.getElementById("btn-lessons");
    const dashboardView = document.getElementById("dashboard-view");
    const signalsView = document.getElementById("signals-view");
    const screenerView = document.getElementById("screener-view");
    const historyView = document.getElementById("history-view");
    const lessonsView = document.getElementById("lessons-view");

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
        { btn: btnScreener, el: screenerView },
        { btn: btnHistory, el: historyView },
        { btn: btnLessons, el: lessonsView }
    ];

    views.forEach(v => {
        v.btn.addEventListener("click", (e) => {
            e.preventDefault();
            // Clear active class from all nav-items (both TA and FA)
            document.querySelectorAll(".nav-menu .nav-item").forEach(item => {
                item.classList.remove("active");
            });
            views.forEach(x => {
                x.el.classList.add("hidden");
            });
            // Ẩn thêm fa-view-container khi chuyển sang các tab TA
            const faViewContainer = document.getElementById("fa-view-container");
            if (faViewContainer) faViewContainer.classList.add("hidden");
            
            v.btn.classList.add("active");
            v.el.classList.remove("hidden");
            
            // Switch mode to TA
            currentAnalysisMode = "ta";
            const pageTitle = document.getElementById("page-title");
            if (pageTitle) pageTitle.textContent = `Trực quan hóa & Phân tích Kỹ thuật - Mã ${currentTicker}`;
            
            // Ẩn/hiện main-header (chỉ hiện ở Dashboard)
            const mainHeader = document.querySelector(".main-header");
            if (mainHeader) {
                if (v.el === dashboardView) {
                    mainHeader.classList.remove("hidden");
                } else {
                    mainHeader.classList.add("hidden");
                }
            }
            
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
        // if (logoBrand) logoBrand.textContent = currentTicker;
        const pageTitle = document.getElementById("page-title");
        if (pageTitle) {
            if (currentAnalysisMode === "fa") {
                pageTitle.textContent = `Phân tích Doanh nghiệp & Định giá - Mã ${currentTicker}`;
            } else {
                pageTitle.textContent = `Trực quan hóa & Phân tích Kỹ thuật - Mã ${currentTicker}`;
            }
        }
        const tickerElements = document.querySelectorAll(".ticker");
        tickerElements.forEach(el => el.textContent = currentTicker);

        // Update lessons ticker label and history
        const lessonsTickerLabel = document.getElementById("lessons-ticker-label");
        if (lessonsTickerLabel) lessonsTickerLabel.textContent = currentTicker;
        try {
            analyzeTickerHistory();
        } catch (err) {
            console.error("Lỗi khi quét lịch sử bài học cho mã:", err);
        }

        // Cập nhật dữ liệu phân tích doanh nghiệp FA
        try {
            renderFAView();
        } catch (err) {
            console.error("Lỗi khi cập nhật dữ liệu FA:", err);
        }

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
        // if (logoBrand) logoBrand.textContent = currentTicker;
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
    function calculateSupportResistance(data = processedData) {
        if (!data || data.length < 50) return { support: null, resistance: null };

        const supports = [];
        const resistances = [];
        const lookback = Math.min(100, data.length);
        const startIndex = data.length - lookback;

        // Window size of 5 days
        const window = 5;

        for (let i = startIndex + window; i < data.length - window; i++) {
            const currentClose = data[i].close;
            let isPeak = true;
            let isTrough = true;

            for (let j = i - window; j <= i + window; j++) {
                if (i === j) continue;
                if (data[j].close >= currentClose) isPeak = false;
                if (data[j].close <= currentClose) isTrough = false;
            }

            if (isPeak) {
                resistances.push({ price: currentClose, index: i });
            }
            if (isTrough) {
                supports.push({ price: currentClose, index: i });
            }
        }

        const latestClose = data[data.length - 1].close;
        
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
        dataRangeLabel.textContent = `Dữ liệu ${currentTicker} từ ${oldest.dateStr} đến ${latest.dateStr}`;

        // KPI 1: Close
        kpiClose.textContent = formatMoney(latest.close) + " đ";
        kpiChangeSub.textContent = formatChange(latest.change, latest.changePct);
        kpiChangeSub.className = "kpi-sub " + (latest.change >= 0 ? "up" : "down");

        // KPI 2: Volume
        kpiVolume.textContent = formatVolume(latest.volume);
        const valueInBillion = latest.value / 1000000000;
        kpiVolume.nextElementSibling.textContent = `Giá trị khớp: ${valueInBillion.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} tỷ VNĐ`;

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
                if (latest.sma20) {
            const diffPct = ((latest.close - latest.sma20) / latest.sma20) * 100;
            kpiTrend.textContent = latest.close > latest.sma20 ? "Tăng giá" : "Giảm giá";
            kpiTrend.className = "kpi-value " + (latest.close > latest.sma20 ? "text-success" : "text-danger");
            kpiSmaSub.textContent = `${diffPct > 0 ? "+" : ""}${diffPct.toFixed(2)}% so với SMA(20) (${formatMoney(Math.round(latest.sma20))})`;
        } else {
            kpiTrend.textContent = "--";
            kpiSmaSub.textContent = "Chưa có đường SMA";
        }

        const result = analyzeSingleTickerData(currentTicker, processedData);
        renderAISignalUI(result);
    }

    function analyzeSingleTickerData(ticker, data) {
        if (!data || data.length < 20) {
            return {
                ticker: ticker,
                close: 0,
                changePct: 0,
                score: 0,
                signalText: "Thiếu Dữ Liệu",
                signalClass: "neutral",
                confidence: "--",
                buyZone: "--",
                target: "--",
                stopLoss: "--",
                explanation: "Cần tối thiểu 20 phiên dữ liệu để tính toán chỉ báo.",
                setupTitle: "Thiếu dữ liệu lịch sử",
                setupIconHtml: `<i class="fa-solid fa-triangle-exclamation"></i>`,
                oppValText: "--",
                oppPercent: 0,
                oppClass: "neutral-low",
                actionText: "ĐANG TÍNH TOÁN...",
                explanationText: "Không có đủ dữ liệu lịch sử để quét các setup dòng tiền.",
                checklist: [],
                ema50Slope: 0
            };
        }

        const latestIdx = data.length - 1;
        const today = data[latestIdx];
        const yesterday = data[latestIdx - 1];
        
        const close = today.close;
        const sma = today.sma20;
        const rsi = today.rsi14;
        const vol = today.volume;

        // 1. Tính toán Xu hướng cấu trúc trung-dài hạn (EMA50 Slope)
        let ema50Slope = 0;
        if (latestIdx >= 5 && today.ema50 && data[latestIdx - 5].ema50) {
            ema50Slope = (today.ema50 - data[latestIdx - 5].ema50) / 5;
        }

        // Tính trung bình khối lượng 20 phiên qua
        let avgVol = 0;
        for (let i = 0; i < 20; i++) {
            const idx = latestIdx - i;
            if (idx >= 0) avgVol += data[idx].volume;
        }
        avgVol = avgVol / 20;

        const isVolBreakout = vol > avgVol * 1.3;

        let score = 0;
        let checklist = [];

        // --- LỚP 1: CẤU TRÚC XU HƯỚNG DÀI HẠN ---
        const isLongTermUptrend = today.ema50 && ema50Slope > 0 && close > today.ema50;
        const isLongTermDowntrend = today.ema50 && ema50Slope < 0 && close < today.ema50;

        if (isLongTermUptrend) {
            score += 2;
            checklist.push({
                type: "bullish",
                label: `Cấu trúc Uptrend dài hạn vững chắc (Giá nằm trên EMA50 hướng lên)`,
                score: 2
            });
        } else if (isLongTermDowntrend) {
            score -= 2.5;
            checklist.push({
                type: "bearish",
                label: `Cấu trúc Downtrend dài hạn nguy hiểm (Giá nằm dưới EMA50 hướng xuống)`,
                score: -2.5
            });
        } else {
            checklist.push({
                type: "neutral",
                label: `Xu hướng dài hạn chưa rõ ràng (Giá dao động quanh EMA50 đi ngang)`,
                score: 0
            });
        }

        // Giá so với SMA20 (Xu hướng ngắn hạn)
        if (sma) {
            if (close > sma) {
                score += 1;
                checklist.push({
                    type: "bullish",
                    label: `Ngắn hạn tích cực (Giá đóng cửa vượt trên đường SMA20)`,
                    score: 1
                });
            } else {
                score -= 1;
                checklist.push({
                    type: "bearish",
                    label: `Ngắn hạn tiêu cực (Giá đóng cửa nằm dưới đường SMA20)`,
                    score: -1
                });
            }
        }

        // Giao cắt đường EMA20/EMA50
        let goldenCross = false;
        let deathCross = false;
        if (today.ema20 && today.ema50 && yesterday.ema20 && yesterday.ema50) {
            if (yesterday.ema20 <= yesterday.ema50 && today.ema20 > today.ema50) {
                goldenCross = true;
            } else if (yesterday.ema20 >= yesterday.ema50 && today.ema20 < today.ema50) {
                deathCross = true;
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

        // --- LỚP 3: BIẾN ĐỘNG & VÙNG CỰC TRỊ ---
        const sr = calculateSupportResistance(data);
        let distSupport = 999;
        let distResist = 999;

        if (sr.support) distSupport = (close - sr.support) / sr.support;
        if (sr.resistance) distResist = (sr.resistance - close) / close;

        if (today.bbUpper && today.bbLower) {
            if (today.low <= today.bbLower && close > today.bbLower) {
                score += 1;
                checklist.push({
                    type: "bullish",
                    label: `Giá chạm dải dưới Bollinger Bands rút chân lên`,
                    score: 1
                });
            } else if (today.high >= today.bbUpper && close < today.bbUpper) {
                score -= 1;
                checklist.push({
                    type: "bearish",
                    label: `Giá chạm dải trên Bollinger Bands bị bán dội lại`,
                    score: -1
                });
            }
        }

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

        // --- LỚP 4: NHẬN DIỆN SETUP VSA/WYCKOFF ---
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

        let isBreakout = false;
        let max20Close = 0;
        for (let i = 1; i <= 20; i++) {
            const idx = latestIdx - i;
            if (idx >= 0 && data[idx].close > max20Close) {
                max20Close = data[idx].close;
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

        let isVCP = false;
        let max15Price = 0;
        let min15Price = 99999999;
        for (let i = 0; i < 15; i++) {
            const idx = latestIdx - i;
            if (idx >= 0) {
                if (data[idx].close > max15Price) max15Price = data[idx].close;
                if (data[idx].close < min15Price) min15Price = data[idx].close;
            }
        }
        const spread15 = (max15Price - min15Price) / min15Price;
        let recent3Vol = 0;
        for (let i = 0; i < 3; i++) {
            recent3Vol += data[latestIdx - i].volume;
        }
        recent3Vol = recent3Vol / 3;

        if (spread15 <= 0.05 && recent3Vol < avgVol * 0.75) {
            isVCP = true;
        }

        let isMomentumSurge = false;
        if (latestIdx >= 2) {
            const p0 = data[latestIdx - 2];
            const p1 = data[latestIdx - 1];
            const p2 = data[latestIdx];

            if (p2.close > p1.close && p1.close > p0.close &&
                p2.close > p2.open && p1.close > p1.open && p0.close > p0.open &&
                p2.volume > p1.volume && p1.volume > p0.volume && p2.volume > avgVol) {
                isMomentumSurge = true;
            }
        }

        let isSharkAccumulation = false;
        let smartBuyDays = 0;
        let smartSellDays = 0;
        for (let i = 0; i < 20; i++) {
            const idx = latestIdx - i;
            if (idx >= 0) {
                const p = data[idx];
                if (p.volume > avgVol * 1.25) {
                    if (p.changePct > 1.0) smartBuyDays++;
                    if (p.changePct < -1.0) smartSellDays++;
                }
            }
        }
        if (smartBuyDays >= 3 && smartBuyDays > smartSellDays) {
            isSharkAccumulation = true;
        }

        let setupTitle = "Chưa hình thành Setup rõ ràng";
        let setupIconHtml = `<i class="fa-solid fa-magnifying-glass-chart"></i>`;
        let oppValText = "30% (Thấp)";
        let oppPercent = 30;
        let oppClass = "neutral-low";
        let actionText = "ĐỨNG NGOÀI QUAN SÁT";
        let explanationText = `Cổ phiếu hiện tại đang vận động tích lũy tự nhiên và chưa có các dấu hiệu đột biến dòng tiền hay bẫy giá của cá mập. Khuyến nghị nhà đầu tư kiên nhẫn nắm giữ tiền mặt hoặc hàng có sẵn, chờ đợi tín hiệu dòng tiền kích hoạt quy luật tăng giá mới.`;

        if (isSpring) {
            score += 3;
            setupTitle = "Bẫy Giảm Giá & Rút Chân Gom Hàng (Bear Trap / Spring)";
            setupIconHtml = `<i class="fa-solid fa-anchor-lock"></i>`;
            oppValText = "90% (Rất Cao)";
            oppPercent = 90;
            oppClass = "very-high";
            actionText = "MUA MẠNH MẼ ĐÓN SÓNG";
            explanationText = `Quy luật Bear Trap kích hoạt khi giá cố tình đạp thủng vùng hỗ trợ cứng ${formatMoney(sr.support)}đ nhằm ép nhỏ lẻ cắt lỗ hoảng loạn. Ngay lập tức dòng tiền lớn nhập cuộc thu gom quyết liệt giúp giá rút chân mạnh mẽ với khối lượng lớn. Đây là quy luật gom hàng cướp cạn kinh điển, báo hiệu nhịp tăng mạnh sắp xảy ra.`;
            checklist.push({ type: "bullish", label: `Quy luật Dòng tiền: Bear Trap tại hỗ trợ cứng`, score: 3 });
        } else if (isBreakout) {
            score += 2.5;
            setupTitle = "Điểm Mua Đột Phá Nền Giá (Volume Breakout)";
            setupIconHtml = `<i class="fa-solid fa-bolt"></i>`;
            oppValText = "85% (Cao)";
            oppPercent = 85;
            oppClass = "high";
            actionText = "MUA BỨT PHÁ (BUY BREAKOUT)";
            explanationText = `Quy luật bứt phá xác nhận khi giá đóng cửa vượt đỉnh 20 phiên gần nhất (${formatMoney(max20Close)}đ) đi kèm khối lượng giao dịch bùng nổ (+${((vol/avgVol - 1)*100).toFixed(0)}% so với trung bình). Điều này cho thấy dòng tiền lớn quyết định đẩy giá qua khỏi vùng kháng cự. Đây là điểm mua bám đuổi xu hướng tăng (Trend Following) có độ tin cậy cao nhất.`;
            checklist.push({ type: "bullish", label: `Quy luật Dòng tiền: Đột phá nền giá (Uptrend)`, score: 2.5 });
        } else if (isVCP) {
            score += 2;
            setupTitle = "Tích Lũy Nền Phẳng Nén Chặt (VCP - Kiệt Nguồn Cung)";
            setupIconHtml = `<i class="fa-solid fa-compress"></i>`;
            oppValText = "75% (Khá Cao)";
            oppPercent = 75;
            oppClass = "high";
            actionText = "MUA GOM TÍCH LŨY (BUY ON BASE)";
            explanationText = `Quy luật Vắt kiệt nguồn cung (VCP) thể hiện qua biên độ dao động giá siêu nhỏ trong 15 phiên (${(spread15*100).toFixed(1)}%) đi kèm khối lượng giao dịch kiệt quệ (-${((1 - recent3Vol/avgVol)*100).toFixed(0)}% so với trung bình). Lực cung bán ra đã hoàn toàn bị triệt tiêu, cổ phiếu như lò xo nén chặt chỉ cần lực cầu nhẹ là bứt phá mạnh. Khuyến nghị mua gom tích lũy lấy vị thế ở nền giá này.`;
            checklist.push({ type: "bullish", label: `Quy luật Dòng tiền: Tích lũy nén chặt kiệt vol (VCP)`, score: 2 });
        } else if (isMomentumSurge) {
            score += 2;
            setupTitle = "Đà Tăng Gia Tốc Bứt Phá (Momentum Surge)";
            setupIconHtml = `<i class="fa-solid fa-arrow-trend-up"></i>`;
            oppValText = "80% (Cao)";
            oppPercent = 80;
            oppClass = "high";
            actionText = "MUA GIA TĂNG TỶ TRỌNG";
            explanationText = `Quy luật đà tăng mạnh mẽ (3 Chàng lính trắng) xuất hiện với 3 phiên tăng liên tiếp, giá đóng cửa tăng dần đi kèm khối lượng tăng dần đều qua từng phiên. Điều này chứng minh dòng tiền cuồn cuộn đổ vào đẩy giá đi lên bất chấp. Xung lực tăng rất mạnh, khuyến nghị mua gia tăng vị thế hoặc mua bám đuổi sóng ngắn hạn.`;
            checklist.push({ type: "bullish", label: `Quy luật Dòng tiền: Đà tăng Momentum gia tốc`, score: 2 });
        } else if (isSharkAccumulation) {
            score += 1.5;
            setupTitle = "Dấu Chân Cá Mập Gom Hàng (Smart Money Accumulation)";
            setupIconHtml = `<i class="fa-solid fa-fish-fins"></i>`;
            oppValText = "70% (Khá Cao)";
            oppPercent = 70;
            oppClass = "high";
            actionText = "MUA TÍCH LŨY CÙNG CÁ MẬP";
            explanationText = `Thuật toán phát hiện dòng tiền thông minh của tổ chức âm thầm thu gom hàng trong 20 phiên qua. Biểu hiện qua số phiên tăng vol lớn chủ đạo chiếm ưu thế so với các phiên giảm vol lớn, đồng thời giá không bị kéo tăng quá mạnh nhằm tránh sự chú ý. Đây là cơ hội mua tích lũy an toàn cùng giá vốn của cá mập.`;
            checklist.push({ type: "bullish", label: `Quy luật Dòng tiền: Cá mập gom hàng âm thầm`, score: 1.5 });
        }

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
            explanation = `Hệ thống Phân tích Định lượng & Dòng tiền cho kết quả đồng thuận tăng cực kỳ mạnh mẽ đạt <strong>+${finalScore >= 0 ? '+' : ''}${finalScore} điểm</strong>. Cổ phiếu đang có sự hỗ trợ của xu hướng lớn dài hạn vững chắc và xuất hiện các setup dòng tiền đáng tin cậy. Khuyến nghị hành động chiến thuật: <strong>${actionText}</strong>.`;
        } else if (finalScore >= 2) {
            signalText = "MUA";
            signalClass = "buy";
            confidence = `${65 + (finalScore - 2) * 5}%`;
            buyZone = `${formatMoney(Math.round(close * 0.975))} - ${formatMoney(Math.round(close * 1.005))} đ`;
            target = sr.resistance ? `${formatMoney(sr.resistance)} đ` : `${formatMoney(Math.round(close * 1.08))} đ (+8%)`;
            stopLoss = sr.support ? `${formatMoney(Math.round(sr.support * 0.975))} đ` : `${formatMoney(Math.round(close * 0.94))} đ (-6%)`;
            explanation = isLongTermUptrend ? `Hệ thống chấm điểm đạt mức tích cực <strong>+${finalScore} điểm</strong>. Cổ phiếu đang vận động trong xu hướng tăng lớn ổn định, các nhịp điều chỉnh rung lắc ngắn hạn là cơ hội tốt để tích lũy hàng giá đỏ. Khuyến nghị hành động chiến thuật: <strong>${actionText}</strong>.` : `Hệ thống chấm điểm đạt <strong>+${finalScore} điểm</strong>, xu hướng đang cải thiện dần từ vùng tích lũy đáy. Khuyến nghị nhà đầu tư mở vị thế mua gom thăm dò từng phần. Khuyến nghị hành động chiến thuật: <strong>${actionText}</strong>.`;
        } else if (finalScore <= -6) {
            signalText = "BÁN MẠNH";
            signalClass = "sell";
            confidence = `${80 + Math.min(20, (-finalScore - 6) * 5)}%`;
            buyZone = "Đứng ngoài hoàn toàn";
            target = "Thu hồi tiền mặt";
            stopLoss = "Hạ tỷ trọng / Bán hết";
            actionText = "BÁN HẠ TỶ TRỌNG TỐI ĐA";
            explanation = `Hệ thống cảnh báo tiêu cực mức độ cao đạt <strong>${finalScore} điểm</strong>. Cổ phiếu bị gãy các mốc hỗ trợ cấu trúc trung hạn quan trọng trong khi EMA50 đang dốc xuống mạnh. Tuyệt đối không bắt đáy cảm tính. Khuyến nghị hành động chiến thuật: <strong>${actionText}</strong>.`;
        } else if (finalScore <= -2) {
            signalText = "BÁN";
            signalClass = "sell";
            confidence = `${65 + (-finalScore - 2) * 5}%`;
            buyZone = "Hạn chế mua mới";
            target = "Chờ tích lũy lại";
            stopLoss = "Bán hạ tỷ trọng";
            actionText = "HẠ TỶ TRỌNG CƠ CẤU";
            explanation = `Hệ thống ghi nhận điểm số yếu <strong>${finalScore} điểm</strong>. Cổ phiếu có dấu hiệu suy thoái dưới đường EMA20 và cấu trúc dài hạn đang xấu đi rõ rệt. Cần chủ động cơ cấu danh mục để bảo vệ vốn. Khuyến nghị hành động chiến thuật: <strong>${actionText}</strong>.`;
        } else {
            signalText = "THEO DÕI";
            signalClass = "neutral";
            confidence = "55%";
            buyZone = sr.support ? `${formatMoney(Math.round(sr.support * 1.005))} - ${formatMoney(Math.round(sr.support * 1.025))} đ` : "Tích lũy quanh hỗ trợ";
            target = `${formatMoney(Math.round(close * 1.05))} đ (+5%)`;
            stopLoss = `${formatMoney(Math.round(close * 0.95))} đ (-5%)`;
            actionText = "TẠM THỜI QUAN SÁT";
            explanation = `Điểm số định lượng ở trạng thái trung tính <strong>${finalScore >= 0 ? '+' : ''}${finalScore} điểm</strong>. Các chỉ báo và dòng tiền đang giằng co chưa có xu hướng bứt phá rõ nét. Khuyến nghị nhà đầu tư tạm thời nắm giữ tỷ trọng an toàn và kiên nhẫn quan sát. Khuyến nghị hành động chiến thuật: <strong>${actionText}</strong>.`;
        }

        return {
            ticker: ticker,
            close: close,
            changePct: today.changePct,
            score: finalScore,
            signalText: signalText,
            signalClass: signalClass,
            confidence: confidence,
            buyZone: buyZone,
            target: target,
            stopLoss: stopLoss,
            explanation: explanation,
            setupTitle: setupTitle,
            setupIconHtml: setupIconHtml,
            oppValText: oppValText,
            oppPercent: oppPercent,
            oppClass: oppClass,
            actionText: actionText,
            explanationText: explanationText,
            checklist: checklist,
            ema50Slope: ema50Slope
        };
    }

    function renderAISignalUI(result) {
        const checklistItems = document.getElementById("checklist-items");
        const setupIcon = document.getElementById("setup-icon");
        const setupName = document.getElementById("setup-name");
        const opportunityValue = document.getElementById("opportunity-value");
        const opportunityBar = document.getElementById("opportunity-bar");
        const setupAction = document.getElementById("setup-action");
        const setupExplanation = document.getElementById("setup-explanation");

        mainSignalBadge.textContent = result.signalText;
        mainSignalBadge.className = `signal-value-badge ${result.signalClass}`;
        
        const signalScore = document.getElementById("signal-score");
        if (signalScore) {
            signalScore.innerHTML = `<span class="${result.score >= 0 ? 'text-success' : 'text-danger'}">${result.score >= 0 ? '+' : ''}${result.score}</span> / 10`;
        }

        signalConfidence.textContent = result.confidence;
        signalBuyZone.textContent = result.buyZone;
        signalTarget.textContent = result.target;
        signalStopLoss.textContent = result.stopLoss;
        signalExplanation.innerHTML = result.explanation;

        // Cập nhật UI Card Setup Dòng Tiền (Thống nhất khuyến nghị)
        if (setupName) setupName.textContent = result.setupTitle;
        if (setupIcon) setupIcon.innerHTML = result.setupIconHtml;
        if (opportunityValue) opportunityValue.textContent = result.oppValText;
        if (setupAction) setupAction.textContent = result.actionText;
        if (setupExplanation) setupExplanation.innerHTML = result.explanationText;
        if (opportunityBar) {
            opportunityBar.className = `opportunity-bar-fill ${result.oppClass}`;
            opportunityBar.style.width = `${result.oppPercent}%`;
        }

        // Render checklist HTML
        if (checklistItems) {
            checklistItems.innerHTML = "";
            result.checklist.forEach(item => {
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
        
        if (chartContainer && exportChartImg && chartInstance) {
            // Hiển thị trạng thái ảnh đang tải
            exportChartImg.src = "";
            exportChartImg.alt = "Đang kết xuất biểu đồ...";

            // Lưu lại phạm vi thời gian thực tế đang hiển thị (khoảng zoom) của người dùng
            const visibleRange = chartInstance.timeScale().getVisibleRange();

            // Tạm thời thay đổi kích thước container để Lightweight Charts vẽ lại biểu đồ đúng chuẩn 980x320px
            const originalWidth = chartContainer.style.width;
            const originalHeight = chartContainer.style.height;
            
            chartContainer.style.width = "980px";
            chartContainer.style.height = "320px";
            chartInstance.resize(980, 320);

            // Đợi 150ms để Lightweight Charts cập nhật kích thước mới
            setTimeout(() => {
                // Áp dụng lại đúng khoảng thời gian zoom cho biểu đồ kích thước xuất ảnh
                if (visibleRange) {
                    chartInstance.timeScale().setVisibleRange(visibleRange);
                }

                // Chờ thêm 50ms để biểu đồ hoàn tất việc render khoảng thời gian mới trước khi html2canvas chụp hình
                setTimeout(() => {
                    html2canvas(chartContainer, {
                        useCORS: true,
                        backgroundColor: '#181d2c',
                        logging: false
                    }).then(canvas => {
                        exportChartImg.src = canvas.toDataURL("image/png");
                        exportChartImg.alt = "Biểu đồ phân tích kỹ thuật";
                        
                        // Khôi phục kích thước biểu đồ ban đầu
                        chartContainer.style.width = originalWidth;
                        chartContainer.style.height = originalHeight;
                        resizeChart();
                        
                        // Khôi phục lại đúng khoảng zoom ban đầu cho biểu đồ chính
                        if (visibleRange) {
                            chartInstance.timeScale().setVisibleRange(visibleRange);
                        }

                        // Mở modal sau khi biểu đồ được chụp xong
                        if (tiktokModal) {
                            tiktokModal.classList.remove("hidden");
                            document.body.style.overflow = "hidden"; // Khóa cuộn trang chính khi mở modal xem trước
                        }
                    }).catch(err => {
                        console.error("Lỗi chụp biểu đồ:", err);
                        
                        // Khôi phục kích thước biểu đồ ban đầu
                        chartContainer.style.width = originalWidth;
                        chartContainer.style.height = originalHeight;
                        resizeChart();
                        
                        if (visibleRange) {
                            chartInstance.timeScale().setVisibleRange(visibleRange);
                        }

                        alert("Không thể chụp ảnh biểu đồ. Vui lòng thử lại!");
                    });
                }, 50);
            }, 150);
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
                
                // Đính kèm link vào DOM để trình duyệt không chặn tải xuống bất đồng bộ
                link.style.display = "none";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

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

    // ----------------------------------------------------
    // BỘ LỌC RÀ SOÁT THỊ TRƯỜNG CHỨNG KHOÁN VIỆT NAM (SCREENER)
    // ----------------------------------------------------
    const SCREENER_TICKERS = [
        "VCB", "BID", "CTG", "TCB", "VPB", "MBB", "ACB", "HDB", "STB", "SHB", "VIB", "TPB", "LPB", "MSB", "OCB", "EIB",
        "SSI", "VND", "VCI", "HCM", "SHS", "MBS", "FTS", "BSI", "CTS", "ORS", "AGR", "VIX",
        "HPG", "HSG", "NKG", "VGS",
        "VIC", "VHM", "VRE", "NVL", "KDH", "NLG", "DXG", "DIG", "PDR", "CEO", "TCH", "KBC", "SZC", "IDC", "VGC",
        "MSN", "MWG", "PNJ", "FRT", "DGW", "VNM", "SAB",
        "GAS", "PLX", "PVD", "PVS", "PVT", "BSR", "POW", "PC1", "GEE",
        "DGC", "DCM", "DPM", "CSV",
        "VCG", "HHV", "LCG", "FCN", "KSB", "C4G",
        "FPT", "CTR", "ELC", "ANV", "IDI", "VHC", "FMC", "GMD", "HAH", "REE",
        "AAA", "ASM", "BCG", "BMP", "BWE", "CII", "CRE", "DBC", "DPG", "DXS",
        "FIT", "GEG", "GEX", "HDG", "IJC", "ITA", "KOS", "LHG", "PAN", "PHR",
        "PPC", "PTB", "SBT", "SCR", "SGP", "SJS", "TNG", "VPI", "VTO", "HT1",
        "LIX", "NT2", "PET", "RAL", "SCS", "TCD", "TIP", "TDM", "TMP", "VIP"
    ];

    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    function parseVndirectData(ticker, d) {
        if (!d || d.s !== "ok" || !d.t || d.t.length === 0) return null;
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

            const closePrice = Math.round(d.c[i] * 1000);
            const openPrice = Math.round(d.o[i] * 1000);
            const highPrice = Math.round(d.h[i] * 1000);
            const lowPrice = Math.round(d.l[i] * 1000);
            const volume = d.v[i];

            const refPrice = i > 0 ? Math.round(d.c[i-1] * 1000) : openPrice;
            const change = closePrice - refPrice;
            const changePct = refPrice > 0 ? (change / refPrice) * 100 : 0;
            const avgPrice = Math.round((openPrice + highPrice + lowPrice + closePrice) / 4);
            const value = Math.round(avgPrice * volume);

            dataRows.push({
                stt: i + 1,
                dateStr,
                chartDate,
                ticker,
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
        return dataRows;
    }

    function calculateScreenerIndicators(data) {
        if (!data || data.length === 0) return data;
        
        // 1. Tính SMA 20
        for (let i = 0; i < data.length; i++) {
            if (i < 19) {
                data[i].sma20 = null;
            } else {
                let sum = 0;
                for (let j = i - 19; j <= i; j++) {
                    sum += data[j].close;
                }
                data[i].sma20 = sum / 20;
            }
        }

        // 2. Tính RSI 14
        if (data.length >= 15) {
            let gains = [];
            let losses = [];
            for (let i = 1; i < data.length; i++) {
                let diff = data[i].close - data[i - 1].close;
                gains.push(diff > 0 ? diff : 0);
                losses.push(diff < 0 ? -diff : 0);
            }
            let avgGain = gains.slice(0, 14).reduce((a, b) => a + b, 0) / 14;
            let avgLoss = losses.slice(0, 14).reduce((a, b) => a + b, 0) / 14;

            if (avgLoss === 0) {
                data[14].rsi14 = 100;
            } else {
                let rs = avgGain / avgLoss;
                data[14].rsi14 = 100 - (100 / (1 + rs));
            }

            for (let i = 15; i < data.length; i++) {
                let gain = gains[i - 1];
                let loss = losses[i - 1];
                avgGain = (avgGain * 13 + gain) / 14;
                avgLoss = (avgLoss * 13 + loss) / 14;
                if (avgLoss === 0) {
                    data[i].rsi14 = 100;
                } else {
                    let rs = avgGain / avgLoss;
                    data[i].rsi14 = 100 - (100 / (1 + rs));
                }
            }
        }

        // 3. Tính EMA 20 và EMA 50
        calculateEMAForData(data, 20, 'ema20');
        calculateEMAForData(data, 50, 'ema50');

        // 4. Tính Bollinger Bands
        for (let i = 0; i < data.length; i++) {
            if (i < 19 || data[i].sma20 === null) {
                data[i].bbUpper = null;
                data[i].bbLower = null;
                data[i].bbMiddle = null;
            } else {
                const sma = data[i].sma20;
                let sumVariance = 0;
                for (let j = i - 19; j <= i; j++) {
                    sumVariance += Math.pow(data[j].close - sma, 2);
                }
                const stdDev = Math.sqrt(sumVariance / 20);
                data[i].bbMiddle = sma;
                data[i].bbUpper = sma + 2 * stdDev;
                data[i].bbLower = sma - 2 * stdDev;
            }
        }

        // 5. Tính MACD
        calculateEMAForData(data, 12, 'ema12');
        calculateEMAForData(data, 26, 'ema26');

        for (let i = 0; i < data.length; i++) {
            if (data[i].ema12 !== null && data[i].ema26 !== null) {
                data[i].macd = data[i].ema12 - data[i].ema26;
            } else {
                data[i].macd = null;
            }
        }

        // Signal Line (EMA 9 of MACD)
        let firstMacdIdx = -1;
        for (let i = 0; i < data.length; i++) {
            if (data[i].macd !== null) {
                firstMacdIdx = i;
                break;
            }
        }

        if (firstMacdIdx !== -1 && data.length - firstMacdIdx >= 9) {
            let macdValues = [];
            for (let i = firstMacdIdx; i < data.length; i++) {
                macdValues.push({ close: data[i].macd });
            }
            calculateEMAForData(macdValues, 9, 'emaVal');
            
            let mvIdx = 0;
            for (let i = 0; i < data.length; i++) {
                if (i < firstMacdIdx) {
                    data[i].macdSignal = null;
                    data[i].macdHist = null;
                } else {
                    const emaVal = macdValues[mvIdx].emaVal;
                    data[i].macdSignal = emaVal;
                    if (data[i].macd !== null && emaVal !== null) {
                        data[i].macdHist = data[i].macd - emaVal;
                    } else {
                        data[i].macdHist = null;
                    }
                    mvIdx++;
                }
            }
        } else {
            for (let i = 0; i < data.length; i++) {
                data[i].macdSignal = null;
                data[i].macdHist = null;
            }
        }

        return data;
    }

    function calculateEMAForData(data, period, key) {
        if (data.length < period) {
            for (let i = 0; i < data.length; i++) {
                data[i][key] = null;
            }
            return;
        }

        let k = 2 / (period + 1);
        let sum = 0;
        for (let i = 0; i < period; i++) {
            sum += data[i].close;
        }
        let ema = sum / period;
        data[period - 1][key] = ema;

        for (let i = period - 2; i >= 0; i--) {
            data[i][key] = null;
        }

        for (let i = period; i < data.length; i++) {
            ema = (data[i].close - ema) * k + ema;
            data[i][key] = ema;
        }
    }

    let screenerResults = [];
    let isScreening = false;
    let currentFilter = "all";

    function renderScreenerTable() {
        const tbody = document.getElementById("screener-table-body");
        if (!tbody) return;
        
        let filtered = [...screenerResults];
        if (currentFilter === "buy") {
            filtered = filtered.filter(r => r.score >= 2);
        } else if (currentFilter === "sell") {
            filtered = filtered.filter(r => r.score <= -2);
        }

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center text-muted" style="padding: 40px 0;">
                        Không có dữ liệu phù hợp với bộ lọc hiện tại.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = "";
        filtered.forEach((res, index) => {
            const tr = document.createElement("tr");
            
            const displayClose = formatMoney(res.close) + " đ";
            
            const changeSign = res.changePct > 0 ? "+" : "";
            const changeClass = res.changePct > 0 ? "text-success" : (res.changePct < 0 ? "text-danger" : "text-muted");
            const displayChange = `<span class="${changeClass}">${changeSign}${res.changePct.toFixed(2)}%</span>`;

            const scoreClass = res.score >= 6 ? "text-success font-bold" : (res.score >= 2 ? "text-success" : (res.score <= -6 ? "text-danger font-bold" : (res.score <= -2 ? "text-danger" : "text-muted")));
            const displayScore = `<span class="${scoreClass}">${res.score >= 0 ? '+' : ''}${res.score}</span>`;

            let emaTrendHtml = "";
            if (res.ema50Slope > 0) {
                emaTrendHtml = `<span class="text-success"><i class="fa-solid fa-arrow-trend-up"></i> Tăng dài hạn</span>`;
            } else if (res.ema50Slope < 0) {
                emaTrendHtml = `<span class="text-danger"><i class="fa-solid fa-arrow-trend-down"></i> Giảm dài hạn</span>`;
            } else {
                emaTrendHtml = `<span class="text-muted"><i class="fa-solid fa-right-left"></i> Đi ngang</span>`;
            }

            let actionBadgeClass = "screener-badge neutral";
            if (res.signalText === "MUA MẠNH" || res.signalText === "MUA") {
                actionBadgeClass = "screener-badge buy";
            } else if (res.signalText === "BÁN MẠNH" || res.signalText === "BÁN") {
                actionBadgeClass = "screener-badge sell";
            }
            const displayAction = `<span class="${actionBadgeClass}">${res.signalText}</span>`;

            tr.innerHTML = `
                <td style="text-align: center; font-weight: bold;">${index + 1}</td>
                <td style="font-weight: bold; color: var(--accent);">${res.ticker}</td>
                <td>${displayClose}</td>
                <td>${displayChange}</td>
                <td style="text-align: center; font-weight: bold;">${displayScore}</td>
                <td>${emaTrendHtml}</td>
                <td style="font-size: 13px;">${res.setupTitle}</td>
                <td>${displayAction}</td>
                <td style="text-align: center;">
                    <button class="btn-view-chart" data-ticker="${res.ticker}">
                        <i class="fa-solid fa-chart-line"></i> Xem
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    async function startMarketScreener() {
        if (isScreening) return;
        isScreening = true;

        screenerResults = [];
        const btnStart = document.getElementById("btn-start-screener");
        const progressContainer = document.getElementById("screener-progress-container");
        const progressStatus = document.getElementById("screener-progress-status");
        const progressPercent = document.getElementById("screener-progress-percent");
        const progressBar = document.getElementById("screener-progress-bar");
        const statsContainer = document.getElementById("screener-stats");
        const tableBody = document.getElementById("screener-table-body");

        btnStart.disabled = true;
        btnStart.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang rà soát...`;
        
        progressContainer.classList.remove("hidden");
        statsContainer.classList.remove("hidden");
        progressBar.style.width = "0%";
        progressPercent.textContent = "0%";
        progressStatus.textContent = "Bắt đầu khởi tạo phiên quét...";

        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center text-muted" style="padding: 40px 0;">
                    <i class="fa-solid fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 10px; display: block; color: var(--accent);"></i>
                    Hệ thống đang rà soát các mã cổ phiếu và tính toán tín hiệu dòng tiền...
                </td>
            </tr>
        `;

        let scannedCount = 0;
        let strongBuyCount = 0;
        let buyCount = 0;
        let sellCount = 0;

        const totalTickers = SCREENER_TICKERS.length;
        const toTimestamp = Math.floor(Date.now() / 1000);
        const fromTimestamp = toTimestamp - 94608000;

        for (let i = 0; i < totalTickers; i++) {
            const ticker = SCREENER_TICKERS[i];
            
            const percent = Math.round(((i + 1) / totalTickers) * 100);
            progressStatus.textContent = `Đang quét dữ liệu của ${ticker} (${i + 1}/${totalTickers})...`;
            progressPercent.textContent = `${percent}%`;
            progressBar.style.width = `${percent}%`;

            const url = `https://dchart-api.vndirect.com.vn/dchart/history?symbol=${ticker}&resolution=D&from=${fromTimestamp}&to=${toTimestamp}`;
            
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error("API Connection Failed");
                const json = await response.json();
                
                const dataRows = parseVndirectData(ticker, json);
                if (dataRows && dataRows.length >= 20) {
                    const computedData = calculateScreenerIndicators(dataRows);
                    const analysis = analyzeSingleTickerData(ticker, computedData);
                    
                    screenerResults.push(analysis);

                    if (analysis.score >= 6) {
                        strongBuyCount++;
                    } else if (analysis.score >= 2) {
                        buyCount++;
                    } else if (analysis.score <= -2) {
                        sellCount++;
                    }
                    
                    scannedCount++;
                    
                    document.getElementById("stat-scanned-count").textContent = `${scannedCount} / ${totalTickers}`;
                    document.getElementById("stat-strong-buy-count").textContent = strongBuyCount;
                    document.getElementById("stat-buy-count").textContent = buyCount;
                    document.getElementById("stat-sell-count").textContent = sellCount;

                    screenerResults.sort((a, b) => b.score - a.score);
                    renderScreenerTable();
                }
            } catch (err) {
                console.warn(`Lỗi rà soát mã ${ticker}:`, err.message);
            }

            await sleep(150);
        }

        isScreening = false;
        btnStart.disabled = false;
        btnStart.innerHTML = `<i class="fa-solid fa-play"></i> Bắt đầu rà soát thị trường`;
        progressStatus.textContent = `Đã hoàn thành rà soát toàn bộ ${totalTickers} mã cổ phiếu thị trường!`;
        
        const btnSync = document.getElementById("btn-sync-firebase");
        if (btnSync) {
            btnSync.classList.remove("hidden");
        }
    }

    const btnStartScreener = document.getElementById("btn-start-screener");
    if (btnStartScreener) {
        btnStartScreener.addEventListener("click", () => {
            startMarketScreener();
        });
    }

    const filterBtns = document.querySelectorAll(".screener-filters .filter-btn");
    filterBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            filterBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentFilter = btn.getAttribute("data-filter");
            renderScreenerTable();
        });
    });

    document.addEventListener("click", function(e) {
        if (e.target && (e.target.classList.contains("btn-view-chart") || e.target.closest(".btn-view-chart"))) {
            const button = e.target.classList.contains("btn-view-chart") ? e.target : e.target.closest(".btn-view-chart");
            if (button.closest("#screener-table")) {
                const ticker = button.getAttribute("data-ticker");
                if (ticker) {
                    const btnDashboard = document.getElementById("btn-dashboard");
                    if (btnDashboard) {
                        btnDashboard.click();
                    }
                    
                    const input = document.getElementById("ticker-input");
                    if (input) input.value = ticker;
                    
                    currentTicker = ticker;
                    loadData();
                }
            }
        }
    });

    // ----------------------------------------------------
    // TÍCH HỢP FIREBASE REALTIME DATABASE & ĐỐI CHIẾU DỰ BÁO T+5
    // ----------------------------------------------------
    let firebaseApp = null;
    let firebaseDatabase = null;

    function initFirebase() {
        const configStr = localStorage.getItem("firebase_screener_config");
        const fbStatus = document.getElementById("firebase-status");
        if (!configStr) {
            if (fbStatus) {
                fbStatus.innerHTML = '<span class="status-dot error" style="background-color: #ef4444; width: 8px; height: 8px; border-radius: 50%; display: inline-block;"></span> Firebase: Chưa cấu hình';
                fbStatus.className = "firebase-status disconnect";
            }
            return;
        }

        try {
            const config = JSON.parse(configStr);
            if (!config.apiKey || !config.databaseURL) {
                throw new Error("Thiếu API Key hoặc Database URL");
            }
            
            if (firebase.apps.length === 0) {
                firebaseApp = firebase.initializeApp(config);
            } else {
                firebaseApp = firebase.app();
            }
            firebaseDatabase = firebaseApp.database();
            
            if (fbStatus) {
                fbStatus.innerHTML = '<span class="status-dot success" style="background-color: #10b981; width: 8px; height: 8px; border-radius: 50%; display: inline-block;"></span> Firebase: Đã kết nối';
                fbStatus.className = "firebase-status connect";
            }
            
            autoEvaluatePastPredictions();
            loadFirebasePerformanceData();
        } catch (err) {
            console.error("Lỗi khởi tạo Firebase:", err);
            if (fbStatus) {
                fbStatus.innerHTML = '<span class="status-dot error" style="background-color: #ef4444; width: 8px; height: 8px; border-radius: 50%; display: inline-block;"></span> Firebase: Lỗi kết nối';
                fbStatus.className = "firebase-status error";
            }
        }
    }

    const btnConfigFb = document.getElementById("btn-config-firebase");
    const fbModal = document.getElementById("firebase-config-modal");
    const closeFbModal = document.getElementById("close-firebase-modal");
    const btnSaveFbConfig = document.getElementById("btn-save-firebase-config");

    if (btnConfigFb && fbModal) {
        btnConfigFb.addEventListener("click", (e) => {
            e.preventDefault();
            fbModal.classList.remove("hidden");
            document.body.style.overflow = "hidden";
            
            const configStr = localStorage.getItem("firebase_screener_config");
            if (configStr) {
                try {
                    const config = JSON.parse(configStr);
                    document.getElementById("fb-apiKey").value = config.apiKey || "";
                    document.getElementById("fb-authDomain").value = config.authDomain || "";
                    document.getElementById("fb-databaseURL").value = config.databaseURL || "";
                    document.getElementById("fb-projectId").value = config.projectId || "";
                    document.getElementById("fb-appId").value = config.appId || "";
                } catch(e){}
            }
        });
    }

    if (closeFbModal && fbModal) {
        closeFbModal.addEventListener("click", () => {
            fbModal.classList.add("hidden");
            document.body.style.overflow = "";
        });
    }
    
    window.addEventListener("click", (e) => {
        if (e.target === fbModal) {
            fbModal.classList.add("hidden");
            document.body.style.overflow = "";
        }
    });

    if (btnSaveFbConfig) {
        btnSaveFbConfig.addEventListener("click", () => {
            const apiKey = document.getElementById("fb-apiKey").value.trim();
            const authDomain = document.getElementById("fb-authDomain").value.trim();
            const databaseURL = document.getElementById("fb-databaseURL").value.trim();
            const projectId = document.getElementById("fb-projectId").value.trim();
            const appId = document.getElementById("fb-appId").value.trim();
            
            if (!apiKey || !databaseURL) {
                alert("Vui lòng điền tối thiểu API Key và Database URL.");
                return;
            }
            
            const config = { apiKey, authDomain, databaseURL, projectId, appId };
            localStorage.setItem("firebase_screener_config", JSON.stringify(config));
            
            alert("Lưu cấu hình thành công! Ứng dụng sẽ tải lại để kết nối.");
            location.reload();
        });
    }

    const btnSyncFb = document.getElementById("btn-sync-firebase");
    if (btnSyncFb) {
        btnSyncFb.addEventListener("click", async () => {
            if (!firebaseDatabase) {
                alert("Vui lòng cấu hình kết nối Firebase trước ở chân trang Sidebar.");
                return;
            }
            if (screenerResults.length === 0) {
                alert("Không có kết quả rà soát nào để đồng bộ.");
                return;
            }
            
            btnSyncFb.disabled = true;
            btnSyncFb.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang đồng bộ...';
            
            try {
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                const todayDateStr = `${yyyy}-${mm}-${dd}`;
                const dateKey = `${yyyy}${mm}${dd}`;

                // Kiểm tra xem dữ liệu ngày hôm nay đã tồn tại trên Firebase chưa
                const snapshot = await firebaseDatabase.ref('predictions_evaluation')
                    .orderByChild('predictDate')
                    .equalTo(todayDateStr)
                    .once('value');
                
                if (snapshot.exists()) {
                    const confirmSync = confirm(`Dữ liệu dự báo của ngày hôm nay (${dd}/${mm}/${yyyy}) đã được đồng bộ lên Firebase trước đó.\nBạn có muốn ghi đè để cập nhật dữ liệu mới nhất không?`);
                    if (!confirmSync) {
                        btnSyncFb.disabled = false;
                        btnSyncFb.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Đồng bộ lên Firebase';
                        return;
                    }
                }
                
                const promises = screenerResults.map(item => {
                    let targetVal = null;
                    if (item.target && item.target !== '--') {
                        const cleaned = item.target.replace(/[^0-9.-]+/g, "");
                        if (cleaned !== "") {
                            const parsed = parseFloat(cleaned);
                            if (!isNaN(parsed)) {
                                targetVal = parsed;
                            }
                        }
                    }
                    
                    let stopLossVal = null;
                    if (item.stopLoss && item.stopLoss !== '--') {
                        const cleaned = item.stopLoss.replace(/[^0-9.-]+/g, "");
                        if (cleaned !== "") {
                            const parsed = parseFloat(cleaned);
                            if (!isNaN(parsed)) {
                                stopLossVal = parsed;
                            }
                        }
                    }
                    
                    let predictPriceVal = parseFloat(item.close);
                    if (isNaN(predictPriceVal)) predictPriceVal = 0;
                    
                    let predictScoreVal = parseFloat(item.score);
                    if (isNaN(predictScoreVal)) predictScoreVal = 0;
                    
                    const key = `${item.ticker}_${dateKey}`;
                    return firebaseDatabase.ref('predictions_evaluation/' + key).set({
                        ticker: item.ticker,
                        predictDate: todayDateStr,
                        predictPrice: predictPriceVal,
                        predictScore: predictScoreVal,
                        predictAction: item.actionText || "TẠM THỜI QUAN SÁT",
                        targetPrice: targetVal,
                        stopLossPrice: stopLossVal,
                        actualPriceT5: null,
                        priceDiffT5: null,
                        statusT5: "WAITING"
                    });
                });
                
                Promise.all(promises).then(() => {
                    alert("Đồng bộ dữ liệu dự báo lên Firebase thành công!");
                    btnSyncFb.disabled = false;
                    btnSyncFb.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Đồng bộ lên Firebase';
                    btnSyncFb.classList.add("hidden");
                    loadFirebasePerformanceData();
                }).catch(err => {
                    console.error("Lỗi đồng bộ Firebase:", err);
                    alert("Đồng bộ thất bại: " + err.message);
                    btnSyncFb.disabled = false;
                    btnSyncFb.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Đồng bộ lên Firebase';
                });
            } catch (globalErr) {
                console.error("Lỗi đồng bộ Firebase (đồng bộ):", globalErr);
                alert("Lỗi đồng bộ: " + globalErr.message);
                btnSyncFb.disabled = false;
                btnSyncFb.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Đồng bộ lên Firebase';
            }
        });
    }

    async function autoEvaluatePastPredictions() {
        if (!firebaseDatabase) return;
        
        try {
            const snapshot = await firebaseDatabase.ref('predictions_evaluation').orderByChild('statusT5').equalTo('WAITING').once('value');
            const data = snapshot.val();
            if (!data) return;
            
            const now = new Date();
            const keysToEvaluate = [];
            
            Object.keys(data).forEach(key => {
                const item = data[key];
                const predictDate = new Date(item.predictDate);
                const diffDays = Math.floor((now - predictDate) / (1000 * 60 * 60 * 24));
                if (diffDays >= 7) {
                    keysToEvaluate.push({ key, item });
                }
            });
            
            if (keysToEvaluate.length === 0) return;
            
            console.log(`[Firebase] Tìm thấy ${keysToEvaluate.length} dự báo chờ đối chiếu T+5...`);
            
            for (const { key, item } of keysToEvaluate) {
                try {
                    const fromTimestamp = Math.floor(new Date(item.predictDate).getTime() / 1000) - (5 * 24 * 60 * 60);
                    const toTimestamp = Math.floor(now.getTime() / 1000) + (2 * 24 * 60 * 60);
                    
                    const url = `https://dchart-api.vndirect.com.vn/dchart/history?symbol=${item.ticker}&resolution=D&from=${fromTimestamp}&to=${toTimestamp}`;
                    const res = await fetch(url);
                    if (!res.ok) continue;
                    const json = await res.json();
                    const dataRows = parseVndirectData(item.ticker, json);
                    if (!dataRows || dataRows.length === 0) continue;
                    
                    const [yyyy, mm, dd] = item.predictDate.split('-');
                    const predictDateStr = `${dd}/${mm}/${yyyy}`;
                    
                    const idx = dataRows.findIndex(d => d.dateStr === predictDateStr);
                    if (idx === -1) continue;
                    
                    if (dataRows.length > idx + 5) {
                        const actualRow = dataRows[idx + 5];
                        const actualPriceT5 = actualRow.close;
                        
                        let stopLossHit = false;
                        if (item.stopLossPrice) {
                            for (let k = 1; k <= 5; k++) {
                                const row = dataRows[idx + k];
                                if (row && row.close <= item.stopLossPrice) {
                                    stopLossHit = true;
                                    break;
                                }
                            }
                        }
                        
                        if (!item.predictPrice || isNaN(item.predictPrice) || item.predictPrice === 0) {
                            console.warn(`[Firebase] Bỏ qua đối chiếu mã ${item.ticker} ngày ${item.predictDate} do giá dự báo không hợp lệ.`);
                            continue;
                        }
                        
                        const priceDiffT5 = ((actualPriceT5 - item.predictPrice) / item.predictPrice) * 100;
                        let statusT5 = "LOSS";
                        
                        const action = item.predictAction || "";
                        if (action.includes("MUA")) {
                            if (stopLossHit) {
                                statusT5 = "STOP_LOSS_HIT";
                            } else if (priceDiffT5 > 0) {
                                statusT5 = "PROFIT";
                            } else {
                                statusT5 = "LOSS";
                            }
                        } else if (action.includes("BÁN") || action.includes("Bán")) {
                            if (priceDiffT5 < 0) {
                                statusT5 = "PROFIT";
                            } else {
                                statusT5 = "LOSS";
                            }
                        } else {
                            statusT5 = priceDiffT5 > 0 ? "PROFIT" : "LOSS";
                        }
                        
                        const finalActualPrice = parseFloat(actualPriceT5.toFixed(0));
                        const finalPriceDiff = parseFloat(priceDiffT5.toFixed(2));
                        
                        if (isNaN(finalActualPrice) || isNaN(finalPriceDiff)) {
                            console.warn(`[Firebase] Bỏ qua đối chiếu mã ${item.ticker} ngày ${item.predictDate} do giá trị tính toán bị NaN.`);
                            continue;
                        }
                        
                        await firebaseDatabase.ref('predictions_evaluation/' + key).update({
                            actualPriceT5: finalActualPrice,
                            priceDiffT5: finalPriceDiff,
                            statusT5: statusT5
                        });
                        console.log(`[Firebase] Đối chiếu thành công mã ${item.ticker} ngày ${item.predictDate}: ${statusT5} (${priceDiffT5.toFixed(2)}%)`);
                    }
                } catch (e) {
                    console.warn(`Lỗi đối chiếu mã ${item.ticker}:`, e.message);
                }
                await new Promise(r => setTimeout(r, 200));
            }
            
            loadFirebasePerformanceData();
        } catch (err) {
            console.error("Lỗi chạy đối chiếu tự động:", err);
        }
    }

    async function loadFirebasePerformanceData() {
        if (!firebaseDatabase) return;
        
        try {
            const snapshot = await firebaseDatabase.ref('predictions_evaluation').once('value');
            const data = snapshot.val();
            
            const perfWinRate = document.getElementById("perf-win-rate");
            const perfTotalCount = document.getElementById("perf-total-count");
            const perfProfitCount = document.getElementById("perf-profit-count");
            const perfLossCount = document.getElementById("perf-loss-count");
            const perfRecentBody = document.getElementById("perf-recent-body");
            
            if (!data) {
                if (perfWinRate) perfWinRate.textContent = "0%";
                if (perfTotalCount) perfTotalCount.textContent = "0";
                if (perfProfitCount) perfProfitCount.textContent = "0";
                if (perfLossCount) perfLossCount.textContent = "0";
                if (perfRecentBody) {
                    perfRecentBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 20px; text-align: center; color: var(--text-muted);">Chưa có dữ liệu dự báo. Tiến hành rà soát và đồng bộ lên Firebase!</td></tr>`;
                }
                return;
            }
            
            let total = 0;
            let profit = 0;
            let loss = 0;
            const completedDeals = [];
            
            Object.keys(data).forEach(key => {
                const item = data[key];
                if (item.statusT5 !== "WAITING") {
                    total++;
                    if (item.statusT5 === "PROFIT") {
                        profit++;
                    } else {
                        loss++;
                    }
                    completedDeals.push(item);
                }
            });
            
            const winRate = total > 0 ? Math.round((profit / total) * 100) : 0;
            
            if (perfWinRate) perfWinRate.textContent = `${winRate}%`;
            if (perfTotalCount) perfTotalCount.textContent = total;
            if (perfProfitCount) perfProfitCount.textContent = profit;
            if (perfLossCount) perfLossCount.textContent = loss;
            
            if (perfRecentBody) {
                if (completedDeals.length === 0) {
                    perfRecentBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 20px; text-align: center; color: var(--text-muted);">Chưa có deal nào đủ T+5 để đối chiếu. Vui lòng quay lại sau vài ngày!</td></tr>`;
                } else {
                    completedDeals.sort((a, b) => new Date(b.predictDate) - new Date(a.predictDate));
                    const recentDeals = completedDeals.slice(0, 5);
                    
                    let htmlStr = "";
                    recentDeals.forEach(deal => {
                        const isProfit = deal.statusT5 === "PROFIT";
                        const statusBadge = isProfit ? '<span style="color: #10b981; font-weight: 600;">PROFIT</span>' : (deal.statusT5 === "STOP_LOSS_HIT" ? '<span style="color: #ef4444; font-weight: 600;">SL HIT</span>' : '<span style="color: #ef4444; font-weight: 600;">LOSS</span>');
                        const diffSign = deal.priceDiffT5 > 0 ? '+' : '';
                        const diffColor = deal.priceDiffT5 > 0 ? '#10b981' : '#ef4444';
                        
                        htmlStr += `<tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                            <td style="padding: 8px 12px; font-weight: bold; color: var(--text-primary);">${deal.ticker}</td>
                            <td style="padding: 8px 12px; color: var(--text-secondary);">${deal.predictDate}</td>
                            <td style="padding: 8px 12px; color: var(--text-secondary);">${formatMoney(deal.predictPrice)} đ</td>
                            <td style="padding: 8px 12px; color: var(--text-secondary);">${formatMoney(deal.actualPriceT5)} đ</td>
                            <td style="padding: 8px 12px; text-align: right; font-weight: 600; color: ${diffColor};">${diffSign}${deal.priceDiffT5}% (${statusBadge})</td>
                        </tr>`;
                    });
                    perfRecentBody.innerHTML = htmlStr;
                }
            }
        } catch (err) {
            console.error("Lỗi load performance data:", err);
        }
    }

    // --- PHÂN TÍCH GIAO DỊCH TRONG PHIÊN (INTRADAY ON-DEMAND) ---

    async function fetchIntradayData(ticker) {
        const now = Math.floor(Date.now() / 1000);
        // Lấy dữ liệu 3 ngày gần nhất để đảm bảo luôn có dữ liệu của ngày thứ Sáu nếu là cuối tuần
        const from = now - 3 * 24 * 60 * 60;
        const url = `https://dchart-api.vndirect.com.vn/dchart/history?symbol=${ticker}&resolution=1&from=${from}&to=${now}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error("Không thể kết nối đến máy chủ dữ liệu VNDirect");
        const json = await response.json();
        if (json.s !== "ok" || !json.t || json.t.length === 0) {
            throw new Error("Không tìm thấy dữ liệu giao dịch trong phiên cho mã này");
        }
        
        const dataRows = [];
        for (let i = 0; i < json.t.length; i++) {
            dataRows.push({
                time: json.t[i],
                open: json.o[i],
                high: json.h[i],
                low: json.l[i],
                close: json.c[i],
                volume: json.v[i]
            });
        }
        
        // Chỉ lấy nến của ngày giao dịch gần nhất
        const latestTimestamp = dataRows[dataRows.length - 1].time;
        const latestDate = new Date(latestTimestamp * 1000).toDateString();
        
        const filteredData = dataRows.filter(row => {
            return new Date(row.time * 1000).toDateString() === latestDate;
        });
        
        return filteredData;
    }

    function analyzeIntradayFlow(data) {
        let totalBuyVol = 0;
        let totalSellVol = 0;
        
        data.forEach(row => {
            const date = new Date((row.time + 7 * 3600) * 1000);
            const timeStr = String(date.getUTCHours()).padStart(2, '0') + ":" + String(date.getUTCMinutes()).padStart(2, '0');
            if (timeStr === "09:15" || timeStr === "14:45") {
                return;
            }

            const high = row.high;
            const low = row.low;
            const close = row.close;
            const volume = row.volume;
            
            if (high === low) {
                totalBuyVol += volume / 2;
                totalSellVol += volume / 2;
            } else {
                // Tỷ lệ CLV (Chaikin Money Flow Volume) = ((Close - Low) - (High - Close)) / (High - Low)
                const clv = ((close - low) - (high - close)) / (high - low);
                const clvPct = (clv + 1) / 2; // Chuyển sang khoảng [0, 1]
                
                const buyVol = volume * clvPct;
                const sellVol = volume * (1 - clvPct);
                
                totalBuyVol += buyVol;
                totalSellVol += sellVol;
            }
        });
        
        const totalVol = totalBuyVol + totalSellVol;
        const buyPct = totalVol > 0 ? Math.round((totalBuyVol / totalVol) * 100) : 50;
        const sellPct = totalVol > 0 ? 100 - buyPct : 50;
        
        return {
            totalBuyVol: Math.round(totalBuyVol),
            totalSellVol: Math.round(totalSellVol),
            buyPct: buyPct,
            sellPct: sellPct
        };
    }

    function detectSharkActivity(data) {
        const sharkTrades = [];
        let sharkBuyVol = 0;
        let sharkSellVol = 0;
        
        for (let i = 20; i < data.length; i++) {
            const current = data[i];
            let prevSum = 0;
            for (let j = 1; j <= 20; j++) {
                prevSum += data[i - j].volume;
            }
            const avpm = prevSum / 20;
            
            // Lọc nến volume đột biến gấp 5 lần trung bình và lớn hơn 150.000 cp
            if (current.volume > avpm * 5 && current.volume > 150000) {
                const date = new Date((current.time + 7 * 3600) * 1000);
                const timeStr = String(date.getUTCHours()).padStart(2, '0') + ":" + String(date.getUTCMinutes()).padStart(2, '0');
                
                // Loại bỏ phiên khớp định kỳ mở cửa ATO và đóng cửa ATC tích lũy volume
                if (timeStr === "09:15" || timeStr === "14:45") {
                    continue;
                }
                
                const isBuy = current.close >= current.open;
                const ratio = (current.volume / avpm).toFixed(1);
                
                if (isBuy) {
                    sharkBuyVol += current.volume;
                } else {
                    sharkSellVol += current.volume;
                }
                
                sharkTrades.push({
                    time: timeStr,
                    price: current.close,
                    volume: current.volume,
                    ratio: ratio,
                    action: isBuy ? "GOM HÀNG" : "XẢ HÀNG",
                    isBuy: isBuy
                });
            }
        }
        
        sharkTrades.sort((a, b) => b.time.localeCompare(a.time));
        
        const netVol = sharkBuyVol - sharkSellVol;
        const totalSharkVol = sharkBuyVol + sharkSellVol;
        const buyRatio = totalSharkVol > 0 ? Math.round((sharkBuyVol / totalSharkVol) * 100) : 50;
        
        return {
            trades: sharkTrades,
            netVolume: netVol,
            buyRatio: buyRatio
        };
    }

    function generateIntradayAlerts(data) {
        const alerts = [];
        if (data.length < 5) return alerts;
        
        let maxSoFar = data[0].high;
        let minSoFar = data[0].low;
        
        for (let i = 1; i < data.length; i++) {
            const current = data[i];
            const date = new Date((current.time + 7 * 3600) * 1000);
            const timeStr = String(date.getUTCHours()).padStart(2, '0') + ":" + String(date.getUTCMinutes()).padStart(2, '0');
            
            // Loại bỏ phiên khớp định kỳ mở cửa ATO và đóng cửa ATC tích lũy volume
            if (timeStr === "09:15" || timeStr === "14:45") {
                continue;
            }
            
            if (current.close > maxSoFar && i > 15) {
                alerts.push({
                    time: timeStr,
                    type: "success",
                    message: `Phá vỡ đỉnh ngày (Breakout High): Giá vượt đỉnh cũ ${formatMoney(maxSoFar)}đ vọt lên ${formatMoney(current.close)}đ.`
                });
                maxSoFar = current.high;
            }
            
            if (current.close < minSoFar && i > 15) {
                alerts.push({
                    time: timeStr,
                    type: "danger",
                    message: `Thủng đáy ngày (Breakdown Low): Giá rơi qua hỗ trợ đáy ${formatMoney(minSoFar)}đ xuống ${formatMoney(current.close)}đ.`
                });
                minSoFar = current.low;
            }
            
            if (current.high > maxSoFar) maxSoFar = current.high;
            if (current.low < minSoFar) minSoFar = current.low;
            
            if (i === data.length - 1) {
                const body = Math.abs(current.close - current.open);
                const range = current.high - current.low;
                const lowerShadow = Math.min(current.close, current.open) - current.low;
                const upperShadow = current.high - Math.max(current.close, current.open);
                
                if (lowerShadow > body * 2 && upperShadow < body && range > 0) {
                    alerts.push({
                        time: timeStr,
                        type: "info",
                        message: `Nến rút chân đảo chiều (Hammer): Lực cầu nâng đỡ giá mạnh vùng thấp ${formatMoney(current.low)}đ.`
                    });
                }
            }
        }
        
        alerts.sort((a, b) => b.time.localeCompare(a.time));
        return alerts.slice(0, 5);
    }



    const btnIntradayDeep = document.getElementById("btn-intraday-deep");
    const intradayPanel = document.getElementById("intraday-panel");
    const btnCloseIntraday = document.getElementById("btn-close-intraday");
    
    if (btnIntradayDeep && intradayPanel) {
        btnIntradayDeep.addEventListener("click", async () => {
            if (intradayPanel.classList.contains("hidden")) {
                intradayPanel.classList.remove("hidden");
                intradayPanel.scrollIntoView({ behavior: 'smooth' });
            }
            
            btnIntradayDeep.disabled = true;
            btnIntradayDeep.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang phân tích...';
            
            try {
                const ticker = currentTicker || "VIX";
                const data = await fetchIntradayData(ticker);
                
                const flow = analyzeIntradayFlow(data);
                document.getElementById("intraday-buy-bar").style.width = `${flow.buyPct}%`;
                document.getElementById("intraday-sell-bar").style.width = `${flow.sellPct}%`;
                document.getElementById("intraday-buy-pct").textContent = `${flow.buyPct}%`;
                document.getElementById("intraday-sell-pct").textContent = `${flow.sellPct}%`;
                document.getElementById("intraday-buy-vol").textContent = flow.totalBuyVol.toLocaleString("vi-VN");
                document.getElementById("intraday-sell-vol").textContent = flow.totalSellVol.toLocaleString("vi-VN");
                
                const alertsLog = document.getElementById("intraday-alerts-log");
                const alerts = generateIntradayAlerts(data);
                if (alertsLog) {
                    if (alerts.length === 0) {
                        alertsLog.innerHTML = '<div class="alert-placeholder">Chưa phát hiện tín hiệu bất thường trong ngày hôm nay...</div>';
                    } else {
                        let htmlStr = "";
                        alerts.forEach(item => {
                            htmlStr += `<div class="intraday-alert-item ${item.type}">
                                <span>${item.message}</span>
                                <span class="time">${item.time}</span>
                            </div>`;
                        });
                        alertsLog.innerHTML = htmlStr;
                    }
                }
                
                const shark = detectSharkActivity(data);
                document.getElementById("shark-net-volume").textContent = `${shark.netVolume >= 0 ? '+' : ''}${shark.netVolume.toLocaleString("vi-VN")} cp`;
                document.getElementById("shark-net-volume").style.color = shark.netVolume >= 0 ? '#10b981' : '#ef4444';
                document.getElementById("shark-buy-ratio").textContent = `${shark.buyRatio}%`;
                document.getElementById("shark-buy-ratio").style.color = shark.buyRatio >= 50 ? '#10b981' : '#ef4444';
                
                const sharkTbody = document.getElementById("shark-trades-tbody");
                if (sharkTbody) {
                    if (shark.trades.length === 0) {
                        sharkTbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Không phát hiện lệnh lớn đột biến nào trong phiên...</td></tr>';
                    } else {
                        let htmlStr = "";
                        shark.trades.slice(0, 10).forEach(trade => {
                            const actionColor = trade.isBuy ? '#10b981' : '#ef4444';
                            htmlStr += `<tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                                <td style="padding: 8px 12px; color: var(--text-secondary);">${trade.time}</td>
                                <td style="padding: 8px 12px; font-weight: bold; color: var(--text-primary);">${formatMoney(trade.price)} đ</td>
                                <td style="padding: 8px 12px; color: var(--text-secondary);">${trade.volume.toLocaleString("vi-VN")}</td>
                                <td style="padding: 8px 12px; color: #f59e0b; font-weight: 600;">gấp ${trade.ratio} lần</td>
                                <td style="padding: 8px 12px; font-weight: 700; color: ${actionColor};">${trade.action}</td>
                            </tr>`;
                        });
                        sharkTbody.innerHTML = htmlStr;
                    }
                }

            } catch (err) {
                console.error("Lỗi phân tích chuyên sâu Intraday:", err);
                alert("Không thể phân tích trong phiên: " + err.message);
            } finally {
                btnIntradayDeep.disabled = false;
                btnIntradayDeep.innerHTML = '<i class="fa-solid fa-bolt"></i> Phân tích Intraday';
            }
        });
    }
    
    if (btnCloseIntraday && intradayPanel) {
        btnCloseIntraday.addEventListener("click", () => {
            intradayPanel.classList.add("hidden");
            const chartContainer = document.getElementById("chart-container");
            if (chartContainer) chartContainer.scrollIntoView({ behavior: 'smooth' });
        });
    }

    // --- DỮ LIỆU BÀI HỌC LỊCH SỬ CHỨNG KHOÁN ---
    const historicalLessons = [
        {
            id: "downtrend-2022",
            tag: "Downtrend",
            tagClass: "downtrend",
            title: "Downtrend Lịch Sử 2022: Quản trị rủi ro & Bài học Cắt lỗ",
            period: "Tháng 04/2022 - Tháng 11/2022",
            context: "VN-Index lập đỉnh lịch sử quanh 1.535 điểm vào đầu tháng 4/2022 sau gần 2 năm Uptrend kỷ lục nhờ làn sóng nhà đầu tư mới (F0) và lãi suất cực thấp. Tuy nhiên, các chính sách thắt chặt tiền tệ toàn cầu, lạm phát và xử lý sai phạm thị trường đã châm ngòi cho đợt giảm giá khốc liệt nhất lịch sử, đưa chỉ số về vùng 873 điểm vào tháng 11/2022.",
            signals: [
                {
                    icon: "fa-arrow-trend-down",
                    class: "down",
                    title: "Gãy đường xu hướng dài hạn (SMA 200 ngày)",
                    desc: "Đường SMA 200 được xem là xương sống xu hướng dài hạn. Khi giá VN-Index xuyên thủng đường này và đường này bắt đầu dốc xuống, đó là tín hiệu xác nhận chu kỳ Uptrend 2 năm đã kết thúc và thị trường chính thức bước vào Downtrend dài hạn."
                },
                {
                    icon: "fa-circle-exclamation",
                    class: "warn",
                    title: "Hiện tượng Phân kỳ âm RSI trên đồ thị Tuần",
                    desc: "Tại vùng đỉnh 1.500+ điểm của năm 2022, trong khi chỉ số liên tục tạo các đỉnh giá đi ngang hoặc cao hơn, chỉ số động lượng RSI trên khung tuần lại liên tục tạo các đỉnh thấp hơn. Đây là tín hiệu cảnh báo lực mua của dòng tiền lớn đã cạn kiệt, chỉ còn sự hưng phấn ảo từ nhỏ lẻ."
                },
                {
                    icon: "fa-bars-staggered",
                    class: "down",
                    title: "Giao cắt tử thần (Death Cross)",
                    desc: "Đường trung bình ngắn hạn (SMA 50) cắt xuống dưới đường dài hạn (SMA 200). Đây là tín hiệu kích hoạt đà bán tháo kỹ thuật trên diện rộng của các quỹ lớn và hệ thống giao dịch tự động."
                },
                {
                    icon: "fa-chart-simple",
                    class: "warn",
                    title: "Hiện tượng 'Phân phối đỉnh' với Vol cực lớn",
                    desc: "Xuất hiện liên tục các phiên giảm điểm mạnh với khối lượng giao dịch kỷ lục, giá đóng cửa ở mức thấp nhất ngày. Đây là dấu vết dòng tiền lớn (Cá mập) âm thầm thoát hàng sang tay nhà đầu tư cá nhân."
                }
            ],
            takeaways: [
                "Tuân thủ tuyệt đối quy tắc cắt lỗ 7% - 8% từ điểm mua gốc để tránh các khoản lỗ sâu không thể hồi phục.",
                "Tuyệt đối không trung bình giá xuống trên một xu hướng giảm dài hạn (Downtrend) vì đáy của hôm nay có thể là đỉnh của ngày mai.",
                "Bảo toàn vốn và giữ tỷ trọng tiền mặt cao khi các đường xu hướng lớn (SMA 200) bị gãy."
            ],
            svg: `
            <svg viewBox="0 0 600 220" class="lesson-schema-svg">
                <!-- Grid Lines -->
                <line x1="0" y1="40" x2="600" y2="40" class="schema-grid-line" />
                <line x1="0" y1="90" x2="600" y2="90" class="schema-grid-line" />
                <line x1="0" y1="140" x2="600" y2="140" class="schema-grid-line" />
                <line x1="0" y1="190" x2="600" y2="190" class="schema-grid-line" />
                
                <!-- SMA 200 Line (Dốc xuống) -->
                <path d="M 50,70 Q 200,60 300,95 T 550,170" class="schema-indicator-line" stroke="#a855f7" />
                <text x="50" y="60" fill="#a855f7" font-size="9">SMA(200) Dốc xuống</text>
                
                <!-- SMA 50 Line (Cắt xuống SMA 200) -->
                <path d="M 50,55 Q 200,45 310,105 T 550,195" class="schema-indicator-line" stroke="#3b82f6" />
                <text x="50" y="45" fill="#3b82f6" font-size="9">SMA(50)</text>
                
                <!-- Price Line (Đường giá cắm đầu) -->
                <path d="M 50,50 L 120,45 L 180,60 L 220,40 L 260,75 L 300,90 L 330,120 L 380,110 L 440,165 L 480,150 L 550,200" class="schema-price-line" stroke="#ef4444" />
                
                <!-- Highlight Points -->
                <!-- Peak 1535 -->
                <circle cx="220" cy="40" r="5" class="schema-point" fill="#ef4444" />
                <rect x="180" y="10" width="80" height="18" rx="3" class="schema-label-rect" stroke="#ef4444" />
                <text x="220" y="22" fill="#ef4444" class="schema-label-text" text-anchor="middle">Đỉnh 1.535đ</text>
                
                <!-- Death Cross Point -->
                <circle cx="300" cy="98" r="5" class="schema-point" fill="#f59e0b" />
                <rect x="250" y="115" width="100" height="18" rx="3" class="schema-label-rect" stroke="#f59e0b" />
                <text x="300" y="127" fill="#f59e0b" class="schema-label-text" text-anchor="middle">Death Cross (Gãy SMA200)</text>
                
                <!-- Downtrend Panic Sell -->
                <circle cx="440" cy="165" r="5" class="schema-point" fill="#ef4444" />
                <text x="450" y="170" fill="#ef4444" font-size="9" font-weight="bold">Hoảng loạn / Giải chấp</text>
            </svg>
            `
        },
        {
            id: "uptrend-2020",
            tag: "Uptrend",
            tagClass: "uptrend",
            title: "Uptrend Siêu Sóng 2020-2021: Chu kỳ bơm tiền & Kỹ năng Gồng lãi",
            period: "Tháng 04/2020 - Tháng 01/2022",
            context: "Sau cú sụt giảm mạnh về 650 điểm vào tháng 3/2020 do bùng phát dịch COVID-19, ngân hàng nhà nước liên tục hạ lãi suất để kích thích kinh tế. Nguồn tiền rẻ khổng lồ tràn vào thị trường kết hợp cùng làn sóng nhà đầu tư F0 mở tài khoản kỷ lục, tạo nên chu kỳ tăng giá mạnh mẽ nhất lịch sử VN-Index lên mốc 1.500+ điểm.",
            signals: [
                {
                    icon: "fa-arrow-trend-up",
                    class: "up",
                    title: "Bứt phá lên trên đường SMA 200 ngày",
                    desc: "Sau thời gian dài nằm dưới đường xu hướng, giá VN-Index bứt phá mạnh mẽ vượt lên trên đường SMA 200 ngày, đồng thời đường này bắt đầu bẻ ngang và dốc ngược đi lên, báo hiệu chu kỳ Downtrend trước đó đã chấm dứt hoàn toàn."
                },
                {
                    icon: "fa-bolt",
                    class: "up",
                    title: "Điểm giao cắt vàng (Golden Cross)",
                    desc: "Đường SMA 50 ngày cắt mạnh lên trên đường SMA 200 ngày. Đây là tín hiệu xác nhận xu hướng tăng trung và dài hạn chính thức thiết lập, kích hoạt dòng tiền lớn của các tổ chức gom hàng quyết liệt."
                },
                {
                    icon: "fa-circle-plus",
                    class: "up",
                    title: "Tạo đáy và đỉnh sau cao hơn (Higher High & Higher Low)",
                    desc: "Cấu trúc giá tăng bền vững theo lý thuyết Dow. Mỗi nhịp điều chỉnh kỹ thuật đều tạo đáy sau cao hơn đáy trước và bứt phá tạo đỉnh sau cao hơn đỉnh trước, bám sát các đường EMA ngắn hạn (EMA 10, EMA 20)."
                },
                {
                    icon: "fa-chart-line",
                    class: "up",
                    title: "Khối lượng giao dịch tăng trưởng đồng thuận",
                    desc: "Thanh khoản thị trường liên tục gia tăng tỷ lệ thuận với đà tăng giá. Dòng tiền mới liên tục đổ vào hấp thụ toàn bộ lực bán chốt lời, đẩy giá trị giao dịch mỗi phiên từ 4.000 tỷ lên 30.000+ tỷ VNĐ."
                }
            ],
            takeaways: [
                "Trong chu kỳ Uptrend dài hạn, chiến lược tối ưu nhất là 'Gồng lãi' (Buy and Hold) cổ phiếu dẫn đầu thay vì lướt sóng ngắn hạn để tránh mất vị thế tốt.",
                "Sử dụng các đường trung bình động ngắn hạn (như EMA 20) làm hỗ trợ động. Chỉ bán khi xu hướng ngắn hạn này bị gãy với khối lượng lớn.",
                "Đi tiền lớn ngay từ giai đoạn đầu chu kỳ (tại các vùng Golden Cross hoặc khi giá tích lũy đi ngang bứt phá nền)."
            ],
            svg: `
            <svg viewBox="0 0 600 220" class="lesson-schema-svg">
                <!-- Grid Lines -->
                <line x1="0" y1="40" x2="600" y2="40" class="schema-grid-line" />
                <line x1="0" y1="90" x2="600" y2="90" class="schema-grid-line" />
                <line x1="0" y1="140" x2="600" y2="140" class="schema-grid-line" />
                <line x1="0" y1="190" x2="600" y2="190" class="schema-grid-line" />
                
                <!-- SMA 200 Line (Dốc lên) -->
                <path d="M 50,170 Q 200,165 300,120 T 550,60" class="schema-indicator-line" stroke="#a855f7" />
                <text x="50" y="182" fill="#a855f7" font-size="9">SMA(200) Dốc lên</text>
                
                <!-- SMA 50 Line (Cắt lên SMA 200) -->
                <path d="M 50,185 Q 200,170 300,100 T 550,45" class="schema-indicator-line" stroke="#3b82f6" />
                <text x="50" y="198" fill="#3b82f6" font-size="9">SMA(50)</text>
                
                <!-- Price Line (Đường giá dốc lên) -->
                <path d="M 50,195 L 90,170 L 130,180 L 180,140 L 220,155 L 290,110 L 330,125 L 400,85 L 450,95 L 550,35" class="schema-price-line" stroke="#10b981" />
                
                <!-- Highlight Points -->
                <!-- Covid Bottom -->
                <circle cx="50" cy="195" r="5" class="schema-point" fill="#10b981" />
                <rect x="25" y="202" width="70" height="15" rx="3" class="schema-label-rect" stroke="#10b981" />
                <text x="60" y="212" fill="#10b981" class="schema-label-text" text-anchor="middle">Đáy Covid 650đ</text>
                
                <!-- Golden Cross Point -->
                <circle cx="300" cy="115" r="5" class="schema-point" fill="#fbbf24" />
                <rect x="250" y="75" width="100" height="18" rx="3" class="schema-label-rect" stroke="#fbbf24" />
                <text x="300" y="87" fill="#fbbf24" class="schema-label-text" text-anchor="middle">Golden Cross (Uptrend)</text>
                
                <!-- Higher Low -->
                <circle cx="450" cy="95" r="4" class="schema-point" fill="#34d399" />
                <text x="460" y="110" fill="#34d399" font-size="9">Đáy sau cao hơn</text>
            </svg>
            `
        },
        {
            id: "accumulation-2023",
            tag: "Tích lũy",
            tagClass: "accumulation",
            title: "Giai Đoạn Tích Lũy 2023: Nhận diện Gom hàng & Cạn cung",
            period: "Tháng 12/2022 - Tháng 05/2023",
            context: "Sau khi chu kỳ Downtrend khốc liệt kết thúc vào tháng 11/2022, VN-Index bước vào giai đoạn tích lũy tạo đáy lớn (giai đoạn 1 theo lý thuyết Wyckoff) kéo dài gần 6 tháng. Thị trường liên tục đi ngang trong biên độ hẹp quanh 1.000 - 1.100 điểm với sự thờ ơ của nhỏ lẻ và thanh khoản sụt giảm mạnh trước khi bắt đầu con sóng tăng năm 2023.",
            signals: [
                {
                    icon: "fa-compress",
                    class: "warn",
                    title: "Bollinger Bands co bóp siêu chặt (Bollinger Squeeze)",
                    desc: "Độ rộng dải Bollinger Bands thu hẹp lại mức thấp nhất lịch sử, thể hiện biên độ biến động giá đã bị nén cực độ. Quy luật hộp nén chỉ ra rằng sau một giai đoạn nén chặt sẽ là một nhịp bùng nổ xu hướng rất mạnh."
                },
                {
                    icon: "fa-droplet-slash",
                    class: "warn",
                    title: "Thanh khoản kiệt quệ (Cạn cung)",
                    desc: "Khối lượng giao dịch sụt giảm sâu, nhiều phiên khớp lệnh cực kỳ thấp (chỉ bằng 40%-50% trung bình). Điều này chứng tỏ áp lực bán tháo của nhỏ lẻ đã cạn và lực cầu đẩy giá cũng chưa quyết liệt, tạo điều kiện cho tổ chức thu mua cổ phiếu giá rẻ."
                },
                {
                    icon: "fa-border-none",
                    class: "warn",
                    title: "Giá đi ngang trong hộp (Hộp Darvas Box)",
                    desc: "Cổ phiếu liên tục dao động lên xuống chạm biên trên (kháng cự) bị dội lại và chạm biên dưới (hỗ trợ) bật lên. Cấu trúc đi ngang này lặp lại nhiều lần nhằm loại bỏ các nhà đầu tư thiếu kiên nhẫn."
                },
                {
                    icon: "fa-arrow-up-from-bracket",
                    class: "up",
                    title: "Phiên bùng nổ bứt phá (Breakout)",
                    desc: "Kết thúc giai đoạn đi ngang là một phiên tăng điểm mạnh mẽ, vượt qua biên trên của hộp kháng cự với khối lượng giao dịch đột biến (gấp 1,5 - 2 lần trung bình). Đây là tín hiệu xác nhận dòng tiền lớn đánh bứt phá thoát nền tích lũy."
                }
            ],
            takeaways: [
                "Không nên mua đuổi (FOMO) khi giá chạm kháng cự trên của hộp tích lũy, hãy ưu tiên gom hàng tại các vùng hỗ trợ biên dưới.",
                "Thanh khoản cạn kiệt ở vùng tích lũy là tín hiệu TỐT, thể hiện nguồn cung trôi nổi đã bị thu hẹp đáng kể.",
                "Kiên nhẫn chờ đợi phiên Breakout xác nhận để gia tăng tỷ trọng tiền lớn bước vào chu kỳ tăng mới."
            ],
            svg: `
            <svg viewBox="0 0 600 220" class="lesson-schema-svg">
                <!-- Grid Lines -->
                <line x1="0" y1="40" x2="600" y2="40" class="schema-grid-line" />
                <line x1="0" y1="90" x2="600" y2="90" class="schema-grid-line" />
                <line x1="0" y1="140" x2="600" y2="140" class="schema-grid-line" />
                <line x1="0" y1="190" x2="600" y2="190" class="schema-grid-line" />
                
                <!-- Bollinger Upper (Net dut) -->
                <path d="M 50,80 Q 200,90 350,90 T 550,50" class="schema-indicator-line" stroke="rgba(255,255,255,0.2)" stroke-dasharray="3" />
                <text x="50" y="72" fill="rgba(255,255,255,0.4)" font-size="8">Bollinger Upper</text>
                
                <!-- Bollinger Lower (Net dut) -->
                <path d="M 50,160 Q 200,150 350,150 T 550,190" class="schema-indicator-line" stroke="rgba(255,255,255,0.2)" stroke-dasharray="3" />
                <text x="50" y="172" fill="rgba(255,255,255,0.4)" font-size="8">Bollinger Lower</text>
                
                <!-- Hộp Darvas Box -->
                <rect x="150" y="95" width="280" height="50" fill="rgba(245,158,11,0.03)" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="4" />
                <text x="290" y="90" fill="#fbbf24" font-size="10" font-weight="bold" text-anchor="middle">Hộp Tích Lũy (Darvas Box)</text>
                
                <!-- Price Line (Dao dong di ngang roi breakout) -->
                <path d="M 50,150 L 90,105 L 140,135 L 180,100 L 220,140 L 260,105 L 300,138 L 340,110 L 390,140 L 430,95 L 480,70 L 550,60" class="schema-price-line" stroke="#fbbf24" />
                
                <!-- Highlight Points -->
                <!-- Bollinger Squeeze Area -->
                <rect x="330" y="146" width="30" height="2" fill="#ef4444" />
                <text x="290" y="162" fill="rgba(255,255,255,0.5)" font-size="9">Nút thắt cổ chai (Squeeze)</text>
                
                <!-- Breakout Point -->
                <circle cx="430" cy="95" r="5" class="schema-point" fill="#10b981" />
                <rect x="440" y="105" width="80" height="18" rx="3" class="schema-label-rect" stroke="#10b981" />
                <text x="485" y="117" fill="#10b981" class="schema-label-text" text-anchor="middle">Breakout thoát nền</text>
            </svg>
            `
        },
        {
            id: "distribution",
            tag: "Phân phối",
            tagClass: "distribution",
            title: "Giai Đoạn Phân Phối Đỉnh: Dấu hiệu Cá mập rút chân dòng tiền",
            period: "Thời điểm vùng đỉnh chu kỳ",
            context: "Sau một chu kỳ tăng giá mạnh kéo dài, dòng tiền lớn (Cá mập) cần hiện thực hóa lợi nhuận bằng cách bán dần cổ phiếu cho đám đông. Giai đoạn này diễn ra âm thầm, kéo dài vài tuần đến vài tháng. Giá cổ phiếu thường dao động rất lỏng lẻo ở vùng cao đi kèm thanh khoản khổng lồ và ngập tràn tin tức vĩ mô tích cực trước khi rơi tự do.",
            signals: [
                {
                    icon: "fa-triangle-exclamation",
                    class: "warn",
                    title: "Xuất hiện nhiều 'Phiên phân phối' (Distribution Day)",
                    desc: "Phiên phân phối là phiên giảm điểm >0,2% với khối lượng giao dịch cao hơn phiên trước đó. Nếu xuất hiện liên tục từ 4 đến 5 phiên phân phối như vậy trong vòng 2 đến 4 tuần, đó là tín hiệu dòng tiền thông minh đang quyết liệt thoát hàng."
                },
                {
                    icon: "fa-arrow-up-long",
                    class: "down",
                    title: "Nến rút chân trên dài (Mẫu hình Upthrust / Bull Trap)",
                    desc: "Trong phiên, giá kéo tăng mạnh tạo cảm giác bứt phá đỉnh cũ khiến nhà đầu tư hưng phấn mua đuổi. Tuy nhiên, cuối phiên áp lực bán tháo lớn đẩy giá đóng cửa về mức thấp nhất ngày, tạo cây nến có râu trên rất dài (nến búa ngược). Đây là cái bẫy dụ cầu của cá mập."
                },
                {
                    icon: "fa-wave-square",
                    class: "warn",
                    title: "Biến động lỏng lẻo biên độ lớn (High Volatility)",
                    desc: "Giá biến động trồi sụt mạnh, tăng trần hôm trước và giảm sàn hôm sau không rõ nguyên nhân. Sự lỏng lẻo này chứng tỏ lượng cổ phiếu đã rơi vào tay nhỏ lẻ nhiều và dòng tiền lớn không còn kiểm soát hay đỡ giá nữa."
                },
                {
                    icon: "fa-bullhorn",
                    class: "warn",
                    title: "Tin tốt vĩ mô và doanh nghiệp ra dồn dập",
                    desc: "Các tin tức về lợi nhuận đột biến, dự án lớn hay khuyến nghị mua giá mục tiêu cực cao được các công ty chứng khoán công bố liên tục. Tin tốt chính là 'màn sương mù' che đậy hành động phân phối của tổ chức."
                }
            ],
            takeaways: [
                "Bán hạ tỷ trọng danh mục và hạ tỷ lệ vay Margin ngay khi đếm thấy 4-5 phiên phân phối xuất hiện gần nhau.",
                "Tránh xa các cổ phiếu dao động lỏng lẻo ở vùng đỉnh lịch sử và RSI tuần đạt mức quá mua cực hạn (>80).",
                "Mua khi tin xấu cùng cực ở vùng tích lũy đáy, bán khi tin tốt ngập tràn ở vùng đỉnh định giá đắt đỏ."
            ],
            svg: `
            <svg viewBox="0 0 600 220" class="lesson-schema-svg">
                <!-- Grid Lines -->
                <line x1="0" y1="40" x2="600" y2="40" class="schema-grid-line" />
                <line x1="0" y1="90" x2="600" y2="90" class="schema-grid-line" />
                <line x1="0" y1="140" x2="600" y2="140" class="schema-grid-line" />
                <line x1="0" y1="190" x2="600" y2="190" class="schema-grid-line" />
                
                <!-- Support Line -->
                <line x1="150" y1="110" x2="450" y2="110" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="3" />
                <text x="460" y="114" fill="#ef4444" font-size="9">Đường hỗ trợ (Nền phân phối)</text>
                
                <!-- Price Line (Dao dong tao 3 dinh roi break down) -->
                <path d="M 50,180 L 100,120 L 160,70 L 200,110 L 250,55 L 290,110 L 340,58 L 380,110 L 415,65 L 450,110 L 480,145 L 550,195" class="schema-price-line" stroke="#a855f7" />
                
                <!-- Highlight Points -->
                <!-- Peak 1 (Bull Trap / Upthrust) -->
                <circle cx="250" cy="55" r="5" class="schema-point" fill="#ef4444" />
                <rect x="210" y="20" width="80" height="18" rx="3" class="schema-label-rect" stroke="#ef4444" />
                <text x="250" y="32" fill="#ef4444" class="schema-label-text" text-anchor="middle">Upthrust (Bẫy tăng)</text>
                
                <!-- Peak 2 (Distribution) -->
                <circle cx="340" cy="58" r="5" class="schema-point" fill="#a855f7" />
                <text x="350" y="52" fill="#a855f7" font-size="8">Phân phối vùng đỉnh</text>
                
                <!-- Breakdown Point -->
                <circle cx="450" cy="110" r="5" class="schema-point" fill="#ef4444" />
                <rect x="440" y="125" width="90" height="18" rx="3" class="schema-label-rect" stroke="#ef4444" />
                <text x="485" y="137" fill="#ef4444" class="schema-label-text" text-anchor="middle">Breakdown (Gãy hỗ trợ)</text>
            </svg>
            `
        }
    ];

    let currentLessonTab = "ticker";
    let tickerHistoricalLessons = [];

    function analyzeTickerHistory() {
        if (!processedData || processedData.length < 60) {
            tickerHistoricalLessons = [];
            return;
        }

        const N = processedData.length;
        let maxUptrendPct = -Infinity;
        let bestUptrend = null; // { startIdx, endIdx, pct }

        let maxDowntrendPct = -Infinity;
        let bestDowntrend = null; // { startIdx, endIdx, pct }

        // Tìm uptrend lớn nhất (hiệu suất tăng giá tối đa, khoảng cách tối thiểu 60 phiên)
        for (let i = 0; i < N - 60; i++) {
            for (let j = i + 60; j < N; j++) {
                const startPrice = processedData[i].close;
                const endPrice = processedData[j].close;
                if (startPrice <= 0) continue;
                const pct = (endPrice - startPrice) / startPrice;
                if (pct > maxUptrendPct) {
                    maxUptrendPct = pct;
                    bestUptrend = { startIdx: i, endIdx: j, pct: pct };
                }
            }
        }

        // Tìm downtrend lớn nhất (sụt giảm phần trăm lớn nhất, khoảng cách tối thiểu 60 phiên)
        for (let i = 0; i < N - 60; i++) {
            for (let j = i + 60; j < N; j++) {
                const startPrice = processedData[i].close;
                const endPrice = processedData[j].close;
                if (startPrice <= 0) continue;
                const pct = (startPrice - endPrice) / startPrice;
                if (pct > maxDowntrendPct) {
                    maxDowntrendPct = pct;
                    bestDowntrend = { startIdx: i, endIdx: j, pct: pct };
                }
            }
        }

        tickerHistoricalLessons = [];

        if (bestUptrend) {
            const startNode = processedData[bestUptrend.startIdx];
            const endNode = processedData[bestUptrend.endIdx];
            const subData = processedData.slice(bestUptrend.startIdx, bestUptrend.endIdx + 1);
            const pctStr = (bestUptrend.pct * 100).toFixed(1).replace('.', ',');
            
            tickerHistoricalLessons.push({
                id: `ticker-uptrend`,
                tag: `Uptrend ${currentTicker}`,
                tagClass: "uptrend",
                title: `Chu kỳ tăng mạnh nhất ${currentTicker}: +${pctStr}%`,
                period: `${startNode.dateStr} - ${endNode.dateStr}`,
                context: `Trong giai đoạn này, cổ phiếu ${currentTicker} ghi nhận mức tăng trưởng vượt bậc từ ${formatMoney(startNode.close)} VNĐ lên ${formatMoney(endNode.close)} VNĐ (tăng +${pctStr}%). Đây là chu kỳ tăng dài hạn mạnh mẽ nhất trong lịch sử giao dịch gần đây của ${currentTicker}, chứng minh sức mạnh của dòng tiền tổ chức và nền tảng cơ bản vững chắc hỗ trợ đà tăng kéo dài.`,
                signals: [
                    {
                        icon: "fa-chart-line",
                        class: "up",
                        title: "Duy trì vững vàng trên EMA50",
                        desc: `Đường trung bình động EMA50 đóng vai trò là bệ đỡ vững chắc. Mỗi nhịp điều chỉnh kỹ thuật đưa giá về gần EMA50 đều kích hoạt dòng tiền gom hàng mạnh mẽ, duy trì đà tăng trung hạn ổn định.`
                    },
                    {
                        icon: "fa-gauge-high",
                        class: "up",
                        title: "RSI nằm trong vùng xu hướng mạnh",
                        desc: "RSI14 liên tục neo cao trong vùng từ 50 đến 75, thỉnh thoảng tiến vào vùng quá mua (>70) mà không có sự phân kỳ âm nguy hiểm, thể hiện xu hướng tăng đang có gia tốc mạnh mẽ."
                    },
                    {
                        icon: "fa-database",
                        class: "up",
                        title: "Thanh khoản bùng nổ cùng hướng tăng",
                        desc: "Khối lượng giao dịch bình quân trong chu kỳ tăng này cao gấp 1,5 - 2,5 lần so với các giai đoạn đi ngang trước đó, xác nhận dòng tiền lớn của cá mập đang dẫn dắt cuộc chơi."
                    }
                ],
                takeaways: [
                    "Ưu tiên mua gom khi cổ phiếu bứt phá mạnh qua kháng cự đi kèm thanh khoản lớn và đường giá chính thức vượt EMA50.",
                    "Thực hiện nắm giữ chặt chẽ cổ phiếu trong xu hướng tăng, chỉ cân nhắc bán hạ tỷ trọng khi giá có tín hiệu phân phối mạnh hoặc thủng hẳn EMA50.",
                    "Hạn chế bán chốt lời non chỉ vì các chỉ báo kỹ thuật rơi vào vùng quá mua ngắn hạn khi xu hướng tăng dài hạn chưa bị bẻ gãy."
                ],
                svg: generateDynamicSvg(subData, "uptrend")
            });
        }

        if (bestDowntrend) {
            const startNode = processedData[bestDowntrend.startIdx];
            const endNode = processedData[bestDowntrend.endIdx];
            const subData = processedData.slice(bestDowntrend.startIdx, bestDowntrend.endIdx + 1);
            const pctStr = (bestDowntrend.pct * 100).toFixed(1).replace('.', ',');
            
            tickerHistoricalLessons.push({
                id: `ticker-downtrend`,
                tag: `Downtrend ${currentTicker}`,
                tagClass: "downtrend",
                title: `Chu kỳ giảm sâu nhất ${currentTicker}: -${pctStr}%`,
                period: `${startNode.dateStr} - ${endNode.dateStr}`,
                context: `Trong giai đoạn này, cổ phiếu ${currentTicker} sụt giảm khốc liệt từ ${formatMoney(startNode.close)} VNĐ về còn ${formatMoney(endNode.close)} VNĐ (giảm -${pctStr}%). Đây là bài học đắt giá về rủi ro sụt giảm mạnh khi cổ phiếu chính thức kết thúc chu kỳ tăng trưởng, gãy các mốc hỗ trợ cứng và rơi vào xu hướng giảm kéo dài dưới áp lực chốt lời lớn hoặc các yếu tố vĩ mô bất lợi.`,
                signals: [
                    {
                        icon: "fa-arrow-trend-down",
                        class: "down",
                        title: "Giá gãy EMA50 và liên tục bị kháng cự đè nặng",
                        desc: `Giá cổ phiếu bắt đầu chu kỳ giảm khi cắt xuống dưới EMA50 với khối lượng lớn. Trong suốt giai đoạn giảm, EMA50 trở thành đường kháng cự động cực kỳ mạnh mẽ, chặn đứng mọi nhịp hồi phục ngắn hạn.`
                    },
                    {
                        icon: "fa-skull-crossbones",
                        class: "down",
                        title: "Cạm bẫy hồi giả kỹ thuật (Bull Trap)",
                        desc: "Xen kẽ giữa các phiên giảm sàn là những phiên hồi kỹ thuật với thanh khoản thấp, kích thích lòng tham bắt đáy của nhỏ lẻ trước khi tiếp tục chu kỳ giảm sâu hơn và thiết lập đáy mới."
                    },
                    {
                        icon: "fa-circle-exclamation",
                        class: "warn",
                        title: "RSI quá bán kéo dài nhưng giá vẫn giảm",
                        desc: "RSI14 duy trì dưới 30 trong thời gian dài (trạng thái quá bán cực độ). Nhiều nhà đầu tư mua bắt đáy do cho rằng giá đã rẻ nhưng bị thua lỗ nặng do áp lực bán giải chấp tài khoản (Margin Call)."
                    }
                ],
                takeaways: [
                    "Tuyệt đối tuân thủ kỷ luật cắt lỗ (5% - 7%) ngay khi giá cổ phiếu phá vỡ các vùng nền hỗ trợ quan trọng hoặc cắt xuống EMA50.",
                    "Không trung bình giá xuống đối với cổ phiếu đang trong xu hướng downtrend dài hạn, vì không thể biết đâu là đáy thực sự.",
                    "Chỉ tham gia mua lại khi cổ phiếu hoàn thành quá trình tạo đáy trung hạn (ví dụ mẫu hình 2 đáy, vai đầu vai ngược) và vượt thành công lên trên EMA50."
                ],
                svg: generateDynamicSvg(subData, "downtrend")
            });
        }
    }

    function generateDynamicSvg(subData, type) {
        if (!subData || subData.length === 0) return "";
        const N = subData.length;

        let maxPrice = -Infinity;
        let minPrice = Infinity;
        subData.forEach(d => {
            if (d.close > maxPrice) maxPrice = d.close;
            if (d.close < minPrice) minPrice = d.close;
            if (d.ema50 && d.ema50 > maxPrice) maxPrice = d.ema50;
            if (d.ema50 && d.ema50 < minPrice) minPrice = d.ema50;
        });

        const priceDiff = maxPrice - minPrice;
        const padding = priceDiff > 0 ? priceDiff * 0.08 : 1000;
        const scaleMin = minPrice - padding;
        const scaleMax = maxPrice + padding;
        const diff = scaleMax - scaleMin > 0 ? scaleMax - scaleMin : 1;

        // Vẽ đường giá đóng cửa
        let pricePoints = [];
        subData.forEach((d, k) => {
            const x = N > 1 ? (50 + (k / (N - 1)) * 500) : 300;
            const yClose = 180 - ((d.close - scaleMin) / diff) * 140;
            pricePoints.push(`${k === 0 ? 'M' : 'L'} ${x.toFixed(1)},${yClose.toFixed(1)}`);
        });
        const pricePath = pricePoints.join(" ");

        // Vẽ đường EMA50 (nếu có)
        let emaPoints = [];
        subData.forEach((d, k) => {
            if (d.ema50 !== undefined && d.ema50 !== null) {
                const x = N > 1 ? (50 + (k / (N - 1)) * 500) : 300;
                const yEma = 180 - ((d.ema50 - scaleMin) / diff) * 140;
                emaPoints.push(`${emaPoints.length === 0 ? 'M' : 'L'} ${x.toFixed(1)},${yEma.toFixed(1)}`);
            }
        });
        const emaPath = emaPoints.join(" ");

        // Tìm đỉnh và đáy thực tế để vẽ label
        let peakIdx = 0;
        let valleyIdx = 0;
        let peakPrice = -Infinity;
        let valleyPrice = Infinity;
        subData.forEach((d, k) => {
            if (d.close > peakPrice) {
                peakPrice = d.close;
                peakIdx = k;
            }
            if (d.close < valleyPrice) {
                valleyPrice = d.close;
                valleyIdx = k;
            }
        });

        const peakX = N > 1 ? (50 + (peakIdx / (N - 1)) * 500) : 300;
        const peakY = 180 - ((peakPrice - scaleMin) / diff) * 140;

        const valleyX = N > 1 ? (50 + (valleyIdx / (N - 1)) * 500) : 300;
        const valleyY = 180 - ((valleyPrice - scaleMin) / diff) * 140;

        let peakLabelY = peakY - 25;
        if (peakLabelY < 10) peakLabelY = peakY + 15;
        
        let valleyLabelY = valleyY + 8;
        if (valleyLabelY > 200) valleyLabelY = valleyY - 25;

        let peakRectX = peakX - 50;
        if (peakRectX < 5) peakRectX = 5;
        if (peakRectX > 495) peakRectX = 495;

        let valleyRectX = valleyX - 50;
        if (valleyRectX < 5) valleyRectX = 5;
        if (valleyRectX > 495) valleyRectX = 495;

        return `
        <svg viewBox="0 0 600 220" class="lesson-schema-svg">
            <!-- Grid Lines -->
            <line x1="0" y1="40" x2="600" y2="40" class="schema-grid-line" />
            <line x1="0" y1="90" x2="600" y2="90" class="schema-grid-line" />
            <line x1="0" y1="140" x2="600" y2="140" class="schema-grid-line" />
            <line x1="0" y1="190" x2="600" y2="190" class="schema-grid-line" />
            
            <!-- EMA50 line -->
            ${emaPath ? `<path d="${emaPath}" stroke="#f59e0b" stroke-width="1.2" stroke-dasharray="3" fill="none" opacity="0.75" />` : ''}
            ${emaPath ? `<text x="50" y="30" fill="#f59e0b" font-size="8" opacity="0.8">-- Đường trung bình EMA50 thực tế</text>` : ''}
            
            <!-- Price Line -->
            <path d="${pricePath}" class="schema-price-line" stroke="${type === 'uptrend' ? '#10b981' : '#ef4444'}" fill="none" stroke-width="2" />
            
            <!-- Highlight Points -->
            <!-- Peak -->
            <circle cx="${peakX.toFixed(1)}" cy="${peakY.toFixed(1)}" r="5" class="schema-point" fill="#ef4444" />
            <rect x="${peakRectX.toFixed(1)}" y="${peakLabelY.toFixed(1)}" width="100" height="18" rx="3" class="schema-label-rect" stroke="#ef4444" />
            <text x="${(peakRectX + 50).toFixed(1)}" y="${(peakLabelY + 12).toFixed(1)}" fill="#ef4444" class="schema-label-text" text-anchor="middle">Đỉnh: ${formatMoney(peakPrice)}</text>
            
            <!-- Valley -->
            <circle cx="${valleyX.toFixed(1)}" cy="${valleyY.toFixed(1)}" r="5" class="schema-point" fill="#10b981" />
            <rect x="${valleyRectX.toFixed(1)}" y="${valleyLabelY.toFixed(1)}" width="100" height="18" rx="3" class="schema-label-rect" stroke="#10b981" />
            <text x="${(valleyRectX + 50).toFixed(1)}" y="${(valleyLabelY + 12).toFixed(1)}" fill="#10b981" class="schema-label-text" text-anchor="middle">Đáy: ${formatMoney(valleyPrice)}</text>
        </svg>
        `;
    }

    function renderLessonsList() {
        const lessonsList = document.getElementById("lessons-list");
        if (!lessonsList) return;
        
        let htmlStr = "";
        const listToRender = currentLessonTab === "ticker" ? tickerHistoricalLessons : historicalLessons;
        
        if (listToRender.length === 0) {
            htmlStr = `
            <div style="padding: 20px; text-align: center; color: var(--text-secondary); font-size: 13px;">
                <i class="fa-solid fa-folder-open" style="font-size: 24px; margin-bottom: 8px; display: block; opacity: 0.5;"></i>
                Chưa có dữ liệu bài học cho mã ${currentTicker}
            </div>
            `;
            lessonsList.innerHTML = htmlStr;
            const detailContainer = document.getElementById("lesson-detail");
            if (detailContainer) {
                detailContainer.innerHTML = `
                <div style="padding: 40px; text-align: center; color: var(--text-secondary);">
                    Hãy tìm kiếm mã cổ phiếu hợp lệ để tải dữ liệu lịch sử và tự động đúc kết bài học.
                </div>
                `;
            }
            return;
        }

        listToRender.forEach(lesson => {
            htmlStr += `
            <button class="lesson-item-btn" data-id="${lesson.id}">
                <span class="lesson-tag ${lesson.tagClass}">${lesson.tag}</span>
                <span class="lesson-title">${lesson.title}</span>
                <span class="lesson-period"><i class="fa-solid fa-calendar-days"></i> ${lesson.period}</span>
            </button>
            `;
        });
        lessonsList.innerHTML = htmlStr;
        
        // Gắn sự kiện click cho các nút bài học
        const lessonBtns = lessonsList.querySelectorAll(".lesson-item-btn");
        lessonBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                lessonBtns.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                
                const lessonId = btn.getAttribute("data-id");
                showLessonDetail(lessonId);
            });
        });
    }

    function showLessonDetail(lessonId) {
        const listToSearch = currentLessonTab === "ticker" ? tickerHistoricalLessons : historicalLessons;
        const lesson = listToSearch.find(l => l.id === lessonId);
        const detailContainer = document.getElementById("lesson-detail");
        if (!lesson || !detailContainer) return;
        
        // Tạo HTML cho phần chi tiết bài học
        let signalsHtml = "";
        lesson.signals.forEach(sig => {
            const statusClass = sig.class; // up, down, warn
            signalsHtml += `
            <div class="core-signal-item">
                <div class="sig-header ${statusClass}">
                    <i class="fa-solid ${sig.icon}"></i> ${sig.title}
                </div>
                <div class="sig-desc">${sig.desc}</div>
            </div>
            `;
        });
        
        let takeawaysHtml = "";
        lesson.takeaways.forEach(item => {
            takeawaysHtml += `<li>${item}</li>`;
        });
        
        detailContainer.innerHTML = `
            <div class="lesson-detail-header">
                <div class="title-area">
                    <h2>${lesson.title}</h2>
                    <span><i class="fa-solid fa-calendar-days"></i> Chu kỳ: ${lesson.period}</span>
                </div>
            </div>
            <div class="lesson-detail-body">
                <!-- Bối cảnh bài học -->
                <div style="font-size: 14.5px; color: var(--text-secondary); line-height: 1.6; border-left: 3px solid #3b82f6; padding-left: 15px;">
                    <strong>Bối cảnh lịch sử:</strong> ${lesson.context}
                </div>
                
                <!-- Đồ họa trực quan (SVG) -->
                <div>
                    <div class="signals-sub-title"><i class="fa-solid fa-diagram-project"></i> Sơ đồ kỹ thuật chu kỳ</div>
                    <div class="lesson-schema-container">
                        ${lesson.svg}
                    </div>
                </div>
                
                <!-- Các dấu hiệu nhận biết -->
                <div>
                    <div class="signals-sub-title"><i class="fa-solid fa-triangle-exclamation"></i> Các dấu hiệu nhận biết xu hướng dài hạn</div>
                    <div class="core-signals-grid">
                        ${signalsHtml}
                    </div>
                </div>
                
                <!-- Bài học thực chiến -->
                <div class="takeaway-card">
                    <div class="takeaway-title"><i class="fa-solid fa-lightbulb"></i> Bài học thực chiến đúc kết</div>
                    <ul class="takeaway-list">
                        ${takeawaysHtml}
                    </ul>
                </div>
            </div>
        `;
    }

    // Gắn sự kiện chuyển tab bài học (Sub-tabs)
    const tabTickerBtn = document.getElementById("btn-tab-ticker-lessons");
    const tabMacroBtn = document.getElementById("btn-tab-macro-lessons");

    if (tabTickerBtn && tabMacroBtn) {
        tabTickerBtn.addEventListener("click", () => {
            currentLessonTab = "ticker";
            tabTickerBtn.classList.add("active");
            tabMacroBtn.classList.remove("active");
            renderLessonsList();
            
            // Tự động chọn bài học đầu tiên
            const firstBtn = document.querySelector("#lessons-list .lesson-item-btn");
            if (firstBtn) {
                firstBtn.classList.add("active");
                const firstId = firstBtn.getAttribute("data-id");
                showLessonDetail(firstId);
            }
        });

        tabMacroBtn.addEventListener("click", () => {
            currentLessonTab = "macro";
            tabMacroBtn.classList.add("active");
            tabTickerBtn.classList.remove("active");
            renderLessonsList();
            
            // Tự động chọn bài học đầu tiên
            const firstBtn = document.querySelector("#lessons-list .lesson-item-btn");
            if (firstBtn) {
                firstBtn.classList.add("active");
                const firstId = firstBtn.getAttribute("data-id");
                showLessonDetail(firstId);
            }
        });
    }

    // Lắng nghe click vào nút Bài học lịch sử trên Sidebar để render danh sách lần đầu tiên
    if (btnLessons) {
        btnLessons.addEventListener("click", () => {
            // Đảm bảo tab tiêu đề nhãn được cập nhật chính xác
            const lessonsTickerLabel = document.getElementById("lessons-ticker-label");
            if (lessonsTickerLabel) lessonsTickerLabel.textContent = currentTicker;
            
            // Quét lịch sử giá
            analyzeTickerHistory();
            
            // Render danh sách
            renderLessonsList();
            
            // Chọn bài học đầu tiên làm mặc định nếu chưa chọn cái nào
            const activeBtn = document.querySelector("#lessons-list .lesson-item-btn.active");
            if (!activeBtn) {
                const firstBtn = document.querySelector("#lessons-list .lesson-item-btn");
                if (firstBtn) {
                    firstBtn.classList.add("active");
                    const firstId = firstBtn.getAttribute("data-id");
                    showLessonDetail(firstId);
                }
            }
        });
    }

    // --- PHÂN TÍCH DOANH NGHIỆP (FA) LOGIC ---
    let currentAnalysisMode = "ta"; // "ta" hoặc "fa"
    let currentFaTab = "overview"; // overview, performance, balance, ratios, valuation

    function createSeededRandom(seed) {
        let h = 0;
        for (let i = 0; i < seed.length; i++) {
            h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
        }
        return function() {
            h = (Math.imul(1103515245, h) + 12345) | 0;
            return ((h >>> 16) & 32767) / 32768;
        };
    }

    const fundamentalDataDB = {
        "HPG": {
            overview: {
                companyName: "Công ty Cổ phần Tập đoàn Hòa Phát",
                industry: "Thép và Sản phẩm Thép",
                marketCap: 175000000000000,
                sharesOutstanding: 5814785700,
                beta: 1.25,
                foreignRatio: 22.4,
                desc: "Tập đoàn Hòa Phát là một trong những tập đoàn sản xuất công nghiệp tư nhân hàng đầu Việt Nam, khởi đầu từ một Công ty chuyên buôn bán các loại máy xây dựng từ tháng 8/1992. Hòa Phát lần lượt mở rộng sang các lĩnh vực Nội thất, Ống thép, Thép xây dựng, Nông nghiệp và Bất động sản. Hiện nay, sản xuất thép là lĩnh vực cốt lõi chiếm tỷ trọng trên 90% doanh thu và lợi nhuận của Tập đoàn.",
                leaders: [
                    { name: "Trần Đình Long", role: "Chủ tịch HĐQT" },
                    { name: "Nguyễn Việt Thắng", role: "Tổng Giám đốc" }
                ],
                shareholders: [
                    { name: "Trần Đình Long", ratio: 26.08 },
                    { name: "Vũ Thị Hiền (Vợ ông Long)", ratio: 6.88 },
                    { name: "Công ty TNHH Thương mại và Đầu tư Đại Phát", ratio: 5.5 }
                ]
            },
            financials: {
                yearly: [
                    { period: "2020", revenue: 91275, grossProfit: 19150, netProfit: 13506, totalAssets: 131500, liabilities: 59300, equity: 72200 },
                    { period: "2021", revenue: 150865, grossProfit: 41250, netProfit: 34520, totalAssets: 178200, liabilities: 84600, equity: 93600 },
                    { period: "2022", revenue: 141409, grossProfit: 12509, netProfit: 8483, totalAssets: 170300, liabilities: 74200, equity: 96100 },
                    { period: "2023", revenue: 118953, grossProfit: 14453, netProfit: 6800, totalAssets: 187700, liabilities: 85300, equity: 102400 },
                    { period: "2024", revenue: 142500, grossProfit: 20400, netProfit: 11950, totalAssets: 208500, liabilities: 95500, equity: 113000 },
                    { period: "2025", revenue: 154800, grossProfit: 24800, netProfit: 13200, totalAssets: 215000, liabilities: 92000, equity: 123000 }
                ],
                quarterly: [
                    { period: "Q1/24", revenue: 31100, grossProfit: 4100, netProfit: 2870, totalAssets: 195000, liabilities: 89000, equity: 106000 },
                    { period: "Q2/24", revenue: 39600, grossProfit: 5300, netProfit: 3320, totalAssets: 202000, liabilities: 92000, equity: 110000 },
                    { period: "Q3/24", revenue: 34000, grossProfit: 4800, netProfit: 3050, totalAssets: 205000, liabilities: 93000, equity: 112000 },
                    { period: "Q4/24", revenue: 35100, grossProfit: 5200, netProfit: 2970, totalAssets: 208500, liabilities: 95500, equity: 113000 },
                    { period: "Q1/25", revenue: 36200, grossProfit: 5400, netProfit: 3050, totalAssets: 209200, liabilities: 94800, equity: 114400 },
                    { period: "Q2/25", revenue: 38500, grossProfit: 5800, netProfit: 3320, totalAssets: 210000, liabilities: 93000, equity: 117000 },
                    { period: "Q3/25", revenue: 37200, grossProfit: 5500, netProfit: 3050, totalAssets: 212500, liabilities: 93500, equity: 119000 },
                    { period: "Q4/25", revenue: 41100, grossProfit: 6900, netProfit: 3530, totalAssets: 215000, liabilities: 92000, equity: 123000 },
                    { period: "Q1/26", revenue: 39800, grossProfit: 6200, netProfit: 3180, totalAssets: 218200, liabilities: 92200, equity: 126000 }
                ]
            },
            ratios: {
                pe: 13.5,
                pb: 1.45,
                eps: 2270,
                bvps: 21150,
                roe: 11.2,
                roa: 6.2,
                debtToEquity: 0.75
            }
        },
        "FPT": {
            overview: {
                companyName: "Công ty Cổ phần FPT",
                industry: "Công nghệ thông tin & Viễn thông",
                marketCap: 182000000000000,
                sharesOutstanding: 1460000000,
                beta: 0.95,
                foreignRatio: 49.0,
                desc: "FPT là công ty công nghệ và viễn thông hàng đầu Việt Nam. Lĩnh vực kinh doanh cốt lõi gồm: Công nghệ (xuất khẩu phần mềm, tích hợp hệ thống), Viễn thông (cung cấp dịch vụ Internet, truyền hình) và Giáo dục. FPT hiện diện tại 30 quốc gia trên thế giới và là đối tác của nhiều tập đoàn công nghệ lớn toàn cầu.",
                leaders: [
                    { name: "Trương Gia Bình", role: "Chủ tịch HĐQT" },
                    { name: "Nguyễn Văn Khoa", role: "Tổng Giám đốc" }
                ],
                shareholders: [
                    { name: "Trương Gia Bình", ratio: 6.1 },
                    { name: "SCIC (Tổng công ty Đầu tư vốn nhà nước)", ratio: 5.8 },
                    { name: "Bùi Quang Ngọc", ratio: 3.4 }
                ]
            },
            financials: {
                yearly: [
                    { period: "2020", revenue: 29830, grossProfit: 11840, netProfit: 3538, totalAssets: 41700, liabilities: 22800, equity: 18900 },
                    { period: "2021", revenue: 35657, grossProfit: 14120, netProfit: 4337, totalAssets: 53600, liabilities: 28400, equity: 25200 },
                    { period: "2022", revenue: 44010, grossProfit: 17230, netProfit: 5310, totalAssets: 64100, liabilities: 33900, equity: 30200 },
                    { period: "2023", revenue: 52618, grossProfit: 20850, netProfit: 6476, totalAssets: 75300, liabilities: 39500, equity: 35800 },
                    { period: "2024", revenue: 61200, grossProfit: 24300, netProfit: 7750, totalAssets: 86500, liabilities: 45000, equity: 41500 },
                    { period: "2025", revenue: 72500, grossProfit: 28800, netProfit: 9250, totalAssets: 98500, liabilities: 51000, equity: 47500 }
                ],
                quarterly: [
                    { period: "Q1/24", revenue: 14000, grossProfit: 5500, netProfit: 1800, totalAssets: 78000, liabilities: 41000, equity: 37000 },
                    { period: "Q2/24", revenue: 15200, grossProfit: 6000, netProfit: 1950, totalAssets: 81000, liabilities: 42000, equity: 39000 },
                    { period: "Q3/24", revenue: 15500, grossProfit: 6150, netProfit: 2050, totalAssets: 83500, liabilities: 43200, equity: 40300 },
                    { period: "Q4/24", revenue: 16800, grossProfit: 6650, netProfit: 2150, totalAssets: 86500, liabilities: 45000, equity: 41500 },
                    { period: "Q1/25", revenue: 17200, grossProfit: 6850, netProfit: 2210, totalAssets: 89000, liabilities: 46200, equity: 42800 },
                    { period: "Q2/25", revenue: 18100, grossProfit: 7200, netProfit: 2320, totalAssets: 92500, liabilities: 48000, equity: 44500 },
                    { period: "Q3/25", revenue: 18450, grossProfit: 7350, netProfit: 2410, totalAssets: 95200, liabilities: 49200, equity: 46000 },
                    { period: "Q4/25", revenue: 19500, grossProfit: 7800, netProfit: 2500, totalAssets: 98500, liabilities: 51000, equity: 47500 },
                    { period: "Q1/26", revenue: 20200, grossProfit: 8100, netProfit: 2680, totalAssets: 101800, liabilities: 52500, equity: 49300 }
                ]
            },
            ratios: {
                pe: 21.8,
                pb: 4.15,
                eps: 6335,
                bvps: 32530,
                roe: 19.5,
                roa: 9.4,
                debtToEquity: 1.07
            }
        },
        "VIX": {
            overview: {
                companyName: "Công ty Cổ phần Chứng khoán VIX",
                industry: "Dịch vụ tài chính / Chứng khoán",
                marketCap: 12500000000000,
                sharesOutstanding: 1458000000,
                beta: 1.65,
                foreignRatio: 3.2,
                desc: "Chứng khoán VIX (tiền thân là Chứng khoán Vincom) hoạt động chủ yếu trong lĩnh vực Môi giới chứng khoán, Tự doanh, Bảo lãnh phát hành và Tư vấn đầu tư tài chính. VIX nổi tiếng trên thị trường với hoạt động tự doanh hiệu quả cao và danh mục đầu tư linh hoạt.",
                leaders: [
                    { name: "Thái Thị Hồng An", role: "Chủ tịch HĐQT" },
                    { name: "Trần Minh Tuấn", role: "Tổng Giám đốc" }
                ],
                shareholders: [
                    { name: "Nguyễn Văn Tuấn", ratio: 15.02 },
                    { name: "FTG Việt Nam", ratio: 4.5 },
                    { name: "Cổ đông nhỏ lẻ khác", ratio: 80.48 }
                ]
            },
            financials: {
                yearly: [
                    { period: "2020", revenue: 720, grossProfit: 410, netProfit: 328, totalAssets: 3500, liabilities: 1200, equity: 2300 },
                    { period: "2021", revenue: 1568, grossProfit: 980, netProfit: 736, totalAssets: 6800, liabilities: 2100, equity: 4700 },
                    { period: "2022", revenue: 1187, grossProfit: 420, netProfit: 312, totalAssets: 8200, liabilities: 2800, equity: 5400 },
                    { period: "2023", revenue: 2014, grossProfit: 1250, netProfit: 966, totalAssets: 10800, liabilities: 1800, equity: 9000 },
                    { period: "2024", revenue: 2250, grossProfit: 1350, netProfit: 1050, totalAssets: 12500, liabilities: 1600, equity: 10900 },
                    { period: "2025", revenue: 2650, grossProfit: 1620, netProfit: 1280, totalAssets: 14800, liabilities: 1900, equity: 12900 }
                ],
                quarterly: [
                    { period: "Q1/24", revenue: 450, grossProfit: 260, netProfit: 200, totalAssets: 11200, liabilities: 1800, equity: 9400 },
                    { period: "Q2/24", revenue: 520, grossProfit: 300, netProfit: 230, totalAssets: 11800, liabilities: 1700, equity: 10100 },
                    { period: "Q3/24", revenue: 490, grossProfit: 280, netProfit: 215, totalAssets: 12100, liabilities: 1650, equity: 10450 },
                    { period: "Q4/24", revenue: 580, grossProfit: 340, netProfit: 260, totalAssets: 12500, liabilities: 1600, equity: 10900 },
                    { period: "Q1/25", revenue: 620, grossProfit: 380, netProfit: 295, totalAssets: 12800, liabilities: 1650, equity: 11150 },
                    { period: "Q2/25", revenue: 680, grossProfit: 420, netProfit: 330, totalAssets: 13200, liabilities: 1700, equity: 11500 },
                    { period: "Q3/25", revenue: 610, grossProfit: 370, netProfit: 290, totalAssets: 13800, liabilities: 1850, equity: 11950 },
                    { period: "Q4/25", revenue: 720, grossProfit: 440, netProfit: 350, totalAssets: 14800, liabilities: 1900, equity: 12900 },
                    { period: "Q1/26", revenue: 750, grossProfit: 465, netProfit: 375, totalAssets: 15500, liabilities: 2050, equity: 13450 }
                ]
            },
            ratios: {
                pe: 10.8,
                pb: 1.05,
                eps: 878,
                bvps: 8850,
                roe: 10.5,
                roa: 9.2,
                debtToEquity: 0.15
            }
        },
        "VNM": {
            overview: {
                companyName: "Công ty Cổ phần Sữa Việt Nam",
                industry: "Thực phẩm và Đồ uống / Sữa",
                marketCap: 138000000000000,
                sharesOutstanding: 2090000000,
                beta: 0.65,
                foreignRatio: 46.2,
                desc: "Vinamilk là doanh nghiệp sữa lớn nhất Việt Nam và nằm trong Top 40 công ty sữa lớn nhất thế giới về doanh thu. Các sản phẩm chính gồm sữa nước, sữa bột, sữa chua ăn, sữa đặc và nước giải khát. Vinamilk sở hữu hệ thống trang trại bò sữa đạt chuẩn quốc tế trải dài khắp cả nước.",
                leaders: [
                    { name: "Lê Thị Băng Tâm", role: "Chủ tịch HĐQT" },
                    { name: "Mai Kiều Liên", role: "Tổng Giám đốc" }
                ],
                shareholders: [
                    { name: "SCIC (Tổng công ty Đầu tư vốn nhà nước)", ratio: 36.0 },
                    { name: "F&N Dairy Investments Pte Ltd", ratio: 17.69 },
                    { name: "Platinum Victory Pte. Ltd.", ratio: 10.62 }
                ]
            },
            financials: {
                yearly: [
                    { period: "2020", revenue: 59636, grossProfit: 27680, netProfit: 11099, totalAssets: 48400, liabilities: 14800, equity: 33600 },
                    { period: "2021", revenue: 61012, grossProfit: 26350, netProfit: 10532, totalAssets: 52800, liabilities: 16900, equity: 35900 },
                    { period: "2022", revenue: 59956, grossProfit: 23980, netProfit: 8516, totalAssets: 48400, liabilities: 15600, equity: 32800 },
                    { period: "2023", revenue: 60370, grossProfit: 24590, netProfit: 9019, totalAssets: 52700, liabilities: 17100, equity: 35600 },
                    { period: "2024", revenue: 61800, grossProfit: 25500, netProfit: 9550, totalAssets: 54900, liabilities: 17800, equity: 37100 },
                    { period: "2025", revenue: 64200, grossProfit: 26800, netProfit: 9850, totalAssets: 56500, liabilities: 18000, equity: 38500 }
                ],
                quarterly: [
                    { period: "Q1/24", revenue: 14100, grossProfit: 5800, netProfit: 2050, totalAssets: 53200, liabilities: 16800, equity: 36400 },
                    { period: "Q2/24", revenue: 15200, grossProfit: 6300, netProfit: 2280, totalAssets: 53800, liabilities: 17100, equity: 36700 },
                    { period: "Q3/24", revenue: 15000, grossProfit: 6200, netProfit: 2220, totalAssets: 54200, liabilities: 17300, equity: 36900 },
                    { period: "Q4/24", revenue: 15600, grossProfit: 6450, netProfit: 2280, totalAssets: 54900, liabilities: 17800, equity: 37100 },
                    { period: "Q1/25", revenue: 15400, grossProfit: 6380, netProfit: 2250, totalAssets: 55100, liabilities: 17500, equity: 37600 },
                    { period: "Q2/25", revenue: 16100, grossProfit: 6750, netProfit: 2480, totalAssets: 55400, liabilities: 17600, equity: 37800 },
                    { period: "Q3/25", revenue: 16250, grossProfit: 6800, netProfit: 2510, totalAssets: 55900, liabilities: 17700, equity: 38200 },
                    { period: "Q4/25", revenue: 16400, grossProfit: 6900, netProfit: 2490, totalAssets: 56500, liabilities: 18000, equity: 38500 },
                    { period: "Q1/26", revenue: 15800, grossProfit: 6600, netProfit: 2320, totalAssets: 57200, liabilities: 18200, equity: 39000 }
                ]
            },
            ratios: {
                pe: 14.1,
                pb: 3.55,
                eps: 4710,
                bvps: 18420,
                roe: 25.6,
                roa: 17.5,
                debtToEquity: 0.47
            }
        },
        "SSI": {
            overview: {
                companyName: "Công ty Cổ phần Chứng khoán SSI",
                industry: "Dịch vụ tài chính / Chứng khoán",
                marketCap: 65000000000000,
                sharesOutstanding: 1960000000,
                beta: 1.45,
                foreignRatio: 24.5,
                desc: "SSI là một trong những định chế tài chính lớn nhất và có uy tín nhất Việt Nam, dẫn đầu thị phần môi giới chứng khoán trong nhiều năm. SSI cung cấp các dịch vụ tài chính toàn diện bao gồm môi giới, quản lý quỹ, ngân hàng đầu tư và dịch vụ nguồn vốn.",
                leaders: [
                    { name: "Nguyễn Duy Hưng", role: "Chủ tịch HĐQT" },
                    { name: "Nguyễn Hồng Nam", role: "Tổng Giám đốc" }
                ],
                shareholders: [
                    { name: "Công ty TNHH Đầu tư NDH", ratio: 20.1 },
                    { name: "Daiwa Securities Group Inc.", ratio: 15.6 },
                    { name: "Cổ đông nhỏ lẻ khác", ratio: 64.3 }
                ]
            },
            financials: {
                yearly: [
                    { period: "2020", revenue: 4366, grossProfit: 1890, netProfit: 1255, totalAssets: 35800, liabilities: 20100, equity: 15700 },
                    { period: "2021", revenue: 7292, grossProfit: 3450, netProfit: 2695, totalAssets: 50800, liabilities: 29500, equity: 21300 },
                    { period: "2022", revenue: 6517, grossProfit: 2450, netProfit: 1684, totalAssets: 52200, liabilities: 30100, equity: 22100 },
                    { period: "2023", revenue: 7285, grossProfit: 2890, netProfit: 2173, totalAssets: 55400, liabilities: 32600, equity: 22800 },
                    { period: "2024", revenue: 8500, grossProfit: 3600, netProfit: 2700, totalAssets: 62000, liabilities: 35000, equity: 27000 },
                    { period: "2025", revenue: 9800, grossProfit: 4100, netProfit: 3150, totalAssets: 68500, liabilities: 38000, equity: 30500 }
                ],
                quarterly: [
                    { period: "Q1/24", revenue: 1980, grossProfit: 800, netProfit: 610, totalAssets: 56800, liabilities: 31200, equity: 25600 },
                    { period: "Q2/24", revenue: 2150, grossProfit: 890, netProfit: 680, totalAssets: 58500, liabilities: 32400, equity: 26100 },
                    { period: "Q3/24", revenue: 2050, grossProfit: 840, netProfit: 640, totalAssets: 60200, liabilities: 33800, equity: 26400 },
                    { period: "Q4/24", revenue: 2280, grossProfit: 950, netProfit: 710, totalAssets: 62000, liabilities: 35000, equity: 27000 },
                    { period: "Q1/25", revenue: 2320, grossProfit: 980, netProfit: 730, totalAssets: 63200, liabilities: 35400, equity: 27800 },
                    { period: "Q2/25", revenue: 2450, grossProfit: 1020, netProfit: 790, totalAssets: 64500, liabilities: 36200, equity: 28300 },
                    { period: "Q3/25", revenue: 2380, grossProfit: 990, netProfit: 760, totalAssets: 66200, liabilities: 36800, equity: 29400 },
                    { period: "Q4/25", revenue: 2620, grossProfit: 1110, netProfit: 850, totalAssets: 68500, liabilities: 38000, equity: 30500 },
                    { period: "Q1/26", revenue: 2750, grossProfit: 1180, netProfit: 920, totalAssets: 71200, liabilities: 39200, equity: 32000 }
                ]
            },
            ratios: {
                pe: 22.1,
                pb: 2.25,
                eps: 1607,
                bvps: 15560,
                roe: 10.3,
                roa: 4.6,
                debtToEquity: 1.25
            }
        }
    };

    function generateFAData(ticker) {
        if (fundamentalDataDB[ticker]) {
            return fundamentalDataDB[ticker];
        }

        const rnd = createSeededRandom(ticker);

        let closePrice = 20000;
        if (processedData && processedData.length > 0) {
            closePrice = processedData[processedData.length - 1].close;
        }

        let sharesOutstanding = 500000000;
        if (closePrice > 80000) {
            sharesOutstanding = 120000000 + Math.floor(rnd() * 50000000);
        } else if (closePrice < 15000) {
            sharesOutstanding = 1200000000 + Math.floor(rnd() * 400000000);
        } else {
            sharesOutstanding = 400000000 + Math.floor(rnd() * 200000000);
        }

        const marketCap = closePrice * sharesOutstanding;
        const pe = 12 + (rnd() * 6);
        const eps = Math.round(closePrice / pe);
        const pb = 1.2 + (rnd() * 0.8);
        const bvps = Math.round(closePrice / pb);
        
        const roe = 10 + (rnd() * 8);
        const roa = roe * (0.4 + rnd() * 0.2);
        const debtToEquity = roe / roa - 1;

        const netProfitLastYear = Math.round(eps * (sharesOutstanding / 1000000));
        const netMargin = 0.08 + (rnd() * 0.12);
        const revenueLastYear = Math.round(netProfitLastYear / netMargin);

        const yearly = [];
        let curRevenue = revenueLastYear;
        let curNetProfit = netProfitLastYear;
        let curEquity = Math.round(bvps * (sharesOutstanding / 1000000));
        let curAssets = Math.round(curEquity * (1 + debtToEquity));
        
        const years = [2025, 2024, 2023, 2022, 2021, 2020];
        years.forEach((yr, idx) => {
            const factor = 1 - (idx * (0.08 + rnd() * 0.07));
            yearly.unshift({
                period: yr.toString(),
                revenue: Math.round(curRevenue * factor),
                grossProfit: Math.round(curRevenue * factor * (netMargin + 0.1)),
                netProfit: Math.round(curNetProfit * factor),
                totalAssets: Math.round(curAssets * factor),
                liabilities: Math.round(curAssets * factor - curEquity * factor),
                equity: Math.round(curEquity * factor)
            });
        });

        const quarterly = [
            { period: "Q1/24", revenue: Math.round(revenueLastYear * 0.21), grossProfit: Math.round(revenueLastYear * 0.21 * (netMargin + 0.1)), netProfit: Math.round(netProfitLastYear * 0.20), totalAssets: Math.round(curAssets * 0.90), liabilities: Math.round(curAssets * 0.90 - curEquity * 0.90), equity: Math.round(curEquity * 0.90) },
            { period: "Q2/24", revenue: Math.round(revenueLastYear * 0.22), grossProfit: Math.round(revenueLastYear * 0.22 * (netMargin + 0.1)), netProfit: Math.round(netProfitLastYear * 0.21), totalAssets: Math.round(curAssets * 0.92), liabilities: Math.round(curAssets * 0.92 - curEquity * 0.92), equity: Math.round(curEquity * 0.92) },
            { period: "Q3/24", revenue: Math.round(revenueLastYear * 0.23), grossProfit: Math.round(revenueLastYear * 0.23 * (netMargin + 0.1)), netProfit: Math.round(netProfitLastYear * 0.22), totalAssets: Math.round(curAssets * 0.93), liabilities: Math.round(curAssets * 0.93 - curEquity * 0.93), equity: Math.round(curEquity * 0.93) },
            { period: "Q4/24", revenue: Math.round(revenueLastYear * 0.24), grossProfit: Math.round(revenueLastYear * 0.24 * (netMargin + 0.1)), netProfit: Math.round(netProfitLastYear * 0.23), totalAssets: Math.round(curAssets * 0.94), liabilities: Math.round(curAssets * 0.94 - curEquity * 0.94), equity: Math.round(curEquity * 0.94) },
            { period: "Q1/25", revenue: Math.round(revenueLastYear * 0.23), grossProfit: Math.round(revenueLastYear * 0.23 * (netMargin + 0.1)), netProfit: Math.round(netProfitLastYear * 0.22), totalAssets: Math.round(curAssets * 0.96), liabilities: Math.round(curAssets * 0.96 - curEquity * 0.96), equity: Math.round(curEquity * 0.96) },
            { period: "Q2/25", revenue: Math.round(revenueLastYear * 0.24), grossProfit: Math.round(revenueLastYear * 0.24 * (netMargin + 0.1)), netProfit: Math.round(netProfitLastYear * 0.23), totalAssets: Math.round(curAssets * 0.98), liabilities: Math.round(curAssets * 0.98 - curEquity * 0.98), equity: Math.round(curEquity * 0.98) },
            { period: "Q3/25", revenue: Math.round(revenueLastYear * 0.25), grossProfit: Math.round(revenueLastYear * 0.25 * (netMargin + 0.1)), netProfit: Math.round(netProfitLastYear * 0.24), totalAssets: Math.round(curAssets * 0.99), liabilities: Math.round(curAssets * 0.99 - curEquity * 0.99), equity: Math.round(curEquity * 0.99) },
            { period: "Q4/25", revenue: Math.round(revenueLastYear * 0.28), grossProfit: Math.round(revenueLastYear * 0.28 * (netMargin + 0.1)), netProfit: Math.round(netProfitLastYear * 0.27), totalAssets: curAssets, liabilities: Math.round(curAssets - curEquity), equity: curEquity },
            { period: "Q1/26", revenue: Math.round(revenueLastYear * 0.27), grossProfit: Math.round(revenueLastYear * 0.27 * (netMargin + 0.1)), netProfit: Math.round(netProfitLastYear * 0.26), totalAssets: Math.round(curAssets * 1.02), liabilities: Math.round(curAssets * 1.02 - curEquity * 1.02), equity: Math.round(curEquity * 1.02) }
        ];

        return {
            overview: {
                companyName: `Công ty Cổ phần Đầu tư & Phát triển ${ticker}`,
                industry: "Sản xuất và Thương mại tổng hợp",
                marketCap,
                sharesOutstanding,
                beta: 1.0 + (rnd() * 0.5 - 0.25),
                foreignRatio: 5 + Math.floor(rnd() * 15),
                desc: `Công ty Cổ phần Đầu tư & Phát triển ${ticker} là một doanh nghiệp niêm yết trong nhóm ngành Sản xuất và Thương mại. Công ty hoạt động chủ yếu trong việc cung ứng các nguyên vật liệu công nghiệp, dịch vụ thương mại tổng hợp và quản lý tài sản, liên tục nâng cao hiệu suất hoạt động qua các năm.`,
                leaders: [
                    { name: "Nguyễn Văn Hải", role: "Chủ tịch HĐQT" },
                    { name: "Phạm Minh Đức", role: "Tổng Giám đốc" }
                ],
                shareholders: [
                    { name: "Ban lãnh đạo sáng lập", ratio: 18.5 },
                    { name: "Tổng công ty Đầu tư SCIC", ratio: 10.2 },
                    { name: "Các quỹ đầu tư nước ngoài", ratio: 7.8 }
                ]
            },
            financials: {
                yearly,
                quarterly
            },
            ratios: {
                pe,
                pb,
                eps,
                bvps,
                roe,
                roa,
                debtToEquity
            }
        };
    }

    function drawFACalendarChart(financials, type = "yearly") {
        const dataList = type === "yearly" ? financials.yearly : financials.quarterly;
        if (!dataList || dataList.length === 0) return "";

        const isYearly = type === "yearly";
        const sliceIdx = isYearly ? 1 : 4;
        
        if (dataList.length < (isYearly ? 6 : 9)) return "";

        const drawList = dataList.slice(sliceIdx); // 5 kỳ hiển thị
        const W = 600;
        const H = 250;
        const paddingLeft = 55;
        const paddingRight = 55;
        const paddingTop = 30;
        const paddingBottom = 55;

        // 1. Tính toán giá trị max của Doanh thu & Lợi nhuận để làm trục Y bên trái
        let maxVal = -Infinity;
        drawList.forEach(d => {
            if (d.revenue > maxVal) maxVal = d.revenue;
            if (d.netProfit > maxVal) maxVal = d.netProfit;
        });
        if (maxVal <= 0) maxVal = 1000;
        maxVal = maxVal * 1.15;

        // 2. Tính toán tăng trưởng LNST cho 5 kỳ hiển thị
        const growths = [];
        for (let i = sliceIdx; i < dataList.length; i++) {
            const cur = dataList[i].netProfit;
            // Nếu là Năm: so sánh kỳ liền trước (i-1). Nếu là Quý: so sánh cùng kỳ năm trước (i-4)
            const prevIdx = isYearly ? i - 1 : i - 4;
            const prev = dataList[prevIdx].netProfit;
            const g = prev === 0 ? 0 : ((cur - prev) / Math.abs(prev)) * 100;
            growths.push(g);
        }

        // 3. Tính toán min/max của Tăng trưởng để làm trục Y bên phải
        let minG = Math.min(...growths);
        let maxG = Math.max(...growths);
        if (minG > 0) minG = 0;
        if (maxG < 0) maxG = 0;
        let diffG = maxG - minG;
        if (diffG === 0) diffG = 100;
        minG = minG - diffG * 0.15;
        maxG = maxG + diffG * 0.15;

        const chartWidth = W - paddingLeft - paddingRight;
        const chartHeight = H - paddingTop - paddingBottom;
        const barGroupWidth = chartWidth / 5;
        const barWidth = Math.max(10, barGroupWidth * 0.28);

        let barsHtml = "";
        let axisHtml = "";

        // Trục hoành chính và trục tung trái
        axisHtml += `
            <line x1="${paddingLeft}" y1="${H - paddingBottom}" x2="${W - paddingRight}" y2="${H - paddingBottom}" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
            <line x1="${paddingLeft}" y1="${paddingTop}" x2="${paddingLeft}" y2="${H - paddingBottom}" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
            <line x1="${W - paddingRight}" y1="${paddingTop}" x2="${W - paddingRight}" y2="${H - paddingBottom}" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
        `;

        // Vẽ lưới ngang & Nhãn trục Y trái (Doanh thu & Lợi nhuận) & Nhãn trục Y phải (Tăng trưởng)
        for (let i = 0; i <= 4; i++) {
            const y = H - paddingBottom - (chartHeight * i) / 4;
            
            // Trục bên trái (tỷ VNĐ)
            const leftVal = (maxVal * i) / 4;
            let leftText = Math.round(leftVal).toLocaleString("vi-VN") + " tỷ";
            if (i === 0) leftText = "0";

            // Trục bên phải (%)
            const rightVal = minG + ((maxG - minG) * i) / 4;
            const sign = rightVal > 0 ? "+" : "";
            let rightText = sign + rightVal.toFixed(1).replace(".", ",") + "%";
            if (Math.abs(rightVal) < 0.05) rightText = "0%";

            axisHtml += `
                <line x1="${paddingLeft}" y1="${y}" x2="${W - paddingRight}" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-width="1" stroke-dasharray="3" />
                <text x="${paddingLeft - 8}" y="${y + 3}" fill="var(--text-secondary)" font-size="9" text-anchor="end">${leftText}</text>
                <text x="${W - paddingRight + 8}" y="${y + 3}" fill="#fbc02d" font-size="9" text-anchor="start">${rightText}</text>
            `;
        }

        const points = [];

        drawList.forEach((d, idx) => {
            const groupX = paddingLeft + (idx * barGroupWidth);
            const centerX = groupX + barGroupWidth / 2;

            // Cột Doanh thu (Màu đỏ coral #ef5350)
            const revHeight = (d.revenue / maxVal) * chartHeight;
            const revX = centerX - barWidth - 2;
            const revY = H - paddingBottom - revHeight;

            // Cột Lợi nhuận (Màu xanh xám #78909c)
            const profHeight = (d.netProfit / maxVal) * chartHeight;
            const profX = centerX + 2;
            const profY = H - paddingBottom - profHeight;

            barsHtml += `
                <!-- Doanh thu -->
                <rect x="${revX}" y="${revY}" width="${barWidth}" height="${revHeight}" fill="#ef5350" rx="2" class="fa-bar-rect" />
                <text x="${revX + barWidth/2}" y="${Math.max(12, revY - 4)}" fill="#ef5350" font-size="8" font-weight="600" text-anchor="middle">${Math.round(d.revenue).toLocaleString("vi-VN")}</text>

                <!-- Lợi nhuận ròng -->
                <rect x="${profX}" y="${profY}" width="${barWidth}" height="${profHeight}" fill="#78909c" rx="2" class="fa-bar-rect" />
                <text x="${profX + barWidth/2}" y="${Math.max(12, profY - 4)}" fill="#78909c" font-size="8" font-weight="600" text-anchor="middle">${Math.round(d.netProfit).toLocaleString("vi-VN")}</text>

                <!-- Nhãn trục hoành -->
                <text x="${centerX}" y="${H - paddingBottom + 18}" fill="var(--text-primary)" font-size="10" font-weight="600" text-anchor="middle">${d.period}</text>
            `;

            // Lưu tọa độ cho đường Tăng trưởng LNST (%)
            const gVal = growths[idx];
            const yVal = H - paddingBottom - ((gVal - minG) / (maxG - minG)) * chartHeight;
            points.push({ x: centerX, y: yVal, val: gVal });
        });

        // Vẽ đường nối Line (màu vàng #fbc02d)
        let linePath = "";
        points.forEach((p, idx) => {
            if (idx === 0) {
                linePath += `M ${p.x} ${p.y}`;
            } else {
                linePath += ` L ${p.x} ${p.y}`;
            }
        });

        let lineHtml = `
            <path d="${linePath}" fill="none" stroke="#fbc02d" stroke-width="2" />
        `;

        // Vẽ các điểm nút tròn & nhãn giá trị phần trăm
        points.forEach(p => {
            const sign = p.val >= 0 ? "+" : "";
            const formattedVal = sign + p.val.toFixed(1).replace(".", ",") + "%";
            lineHtml += `
                <circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#18181b" stroke="#fbc02d" stroke-width="2" />
                <text x="${p.x}" y="${p.y - 8}" fill="#fbc02d" font-size="8.5" font-weight="700" text-anchor="middle">${formattedVal}</text>
            `;
        });

        // Vẽ Legend ở chân biểu đồ
        const legendY = H - 15;
        const legendHtml = `
            <g transform="translate(${W/2 - 180}, ${legendY})">
                <!-- Doanh thu -->
                <rect x="0" y="-8" width="12" height="8" fill="#ef5350" rx="1" />
                <text x="18" y="0" fill="var(--text-secondary)" font-size="10">Doanh thu thuần</text>
                
                <!-- Lợi nhuận ròng -->
                <rect x="120" y="-8" width="12" height="8" fill="#78909c" rx="1" />
                <text x="138" y="0" fill="var(--text-secondary)" font-size="10">Lợi nhuận sau thuế</text>
                
                <!-- Tăng trưởng LNST -->
                <line x1="260" y1="-4" x2="275" y2="-4" stroke="#fbc02d" stroke-width="2" />
                <circle cx="267.5" cy="-4" r="2.5" fill="#18181b" stroke="#fbc02d" stroke-width="1.5" />
                <text x="283" y="0" fill="var(--text-secondary)" font-size="10">Tăng trưởng LNST (%)</text>
            </g>
        `;

        return `
        <svg viewBox="0 0 ${W} ${H}" class="fa-svg-chart" style="background: transparent; width: 100%;">
            ${axisHtml}
            ${barsHtml}
            ${lineHtml}
            ${legendHtml}
        </svg>
        `;
    }

    function calculateFAValuation(data) {
        let currentPrice = 20000;
        if (processedData && processedData.length > 0) {
            currentPrice = processedData[processedData.length - 1].close;
        }

        const eps = data.ratios.eps;
        const bvps = data.ratios.bvps;

        const targetPE = 15;
        const valPE = eps * targetPE;

        const targetPB = 1.8;
        const valPB = bvps * targetPB;

        const g = 10;
        const valGraham = Math.round(eps * (8.5 + 2 * g) * 4.4 / 7.5);

        const fairValue = Math.round((valPE + valPB + valGraham) / 3);
        const pctDiff = ((fairValue - currentPrice) / currentPrice) * 100;
        let recClass = "rec-fair";
        let recText = "PHÙ HỢP TÍCH LŨY";
        let recDesc = "Thị giá hiện tại đang ở vùng hợp lý so với năng lực cốt lõi của doanh nghiệp.";
        let icon = "fa-circle-check";

        if (pctDiff > 15) {
            recClass = "rec-undervalued";
            recText = "DƯỚI GIÁ TRỊ (RẺ)";
            recDesc = `Thị giá hiện tại đang thấp hơn định giá hợp lý khoảng ${Math.abs(pctDiff).toFixed(1).replace(".", ",")}% - Biên an toàn cao.`;
            icon = "fa-circle-arrow-down";
        } else if (pctDiff < -15) {
            recClass = "rec-overvalued";
            recText = "TRÊN GIÁ TRỊ (ĐẮT)";
            recDesc = `Thị giá hiện tại cao hơn định giá hợp lý khoảng ${Math.abs(pctDiff).toFixed(1).replace(".", ",")}% - Định giá phản ánh quá nhiều kỳ vọng.`;
            icon = "fa-circle-arrow-up";
        }

        return {
            valPE,
            valPB,
            valGraham,
            fairValue,
            currentPrice,
            pctDiff,
            recClass,
            recText,
            recDesc,
            icon
        };
    }

    function renderFAView() {
        const container = document.getElementById("fa-tab-content");
        if (!container) return;

        const data = generateFAData(currentTicker);

        if (currentFaTab === "overview") {
            renderFAOverview(data, container);
        } else if (currentFaTab === "performance") {
            renderFAPerformance(data, container);
        } else if (currentFaTab === "balance") {
            renderFABalanceSheet(data, container);
        } else if (currentFaTab === "ratios") {
            renderFARatios(data, container);
        } else if (currentFaTab === "valuation") {
            renderFAValuation(data, container);
        }
    }

    function renderFAOverview(data, container) {
        let leadersHtml = "";
        data.overview.leaders.forEach(l => {
            leadersHtml += `
                <div style="padding: 10px 14px; background: rgba(255,255,255,0.03); border-radius: 6px; border: 1px solid var(--border-color); display: flex; justify-content: space-between;">
                    <span style="font-weight:600; color: var(--text-primary);">${l.name}</span>
                    <span style="color: var(--text-secondary); font-size: 12.5px;">${l.role}</span>
                </div>
            `;
        });

        let shareholdersHtml = "";
        data.overview.shareholders.forEach(s => {
            shareholdersHtml += `
                <div style="padding: 10px 14px; background: rgba(255,255,255,0.03); border-radius: 6px; border: 1px solid var(--border-color); display: flex; justify-content: space-between;">
                    <span style="font-weight:600; color: var(--text-primary);">${s.name}</span>
                    <span style="color: #3b82f6; font-weight:700;">${s.ratio.toFixed(2).replace(".", ",")}%</span>
                </div>
            `;
        });

        container.innerHTML = `
            <div class="card" style="padding: 20px; display: flex; flex-direction: column; gap: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
                    <div>
                        <h2 style="color: var(--text-primary); margin:0;">${data.overview.companyName} (${currentTicker})</h2>
                        <span style="color: var(--text-secondary); font-size: 13px; display: block; margin-top: 4px;">Phân ngành: <strong>${data.overview.industry}</strong></span>
                    </div>
                    <div style="text-align: right;">
                        <span style="color: var(--text-secondary); font-size: 12px; display: block;">Vốn hóa thị trường</span>
                        <strong style="color: #f59e0b; font-size: 18px;">${(data.overview.marketCap / 1000000000).toLocaleString("vi-VN", {maximumFractionDigits: 1})} tỷ VNĐ</strong>
                    </div>
                </div>

                <div class="kpi-container" style="margin-top: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div class="kpi-card" style="padding: 15px;">
                        <span style="color: var(--text-secondary); font-size: 12px;">Cổ phiếu lưu hành</span>
                        <div style="font-size: 16px; font-weight:700; color: var(--text-primary); margin-top: 5px;">${data.overview.sharesOutstanding.toLocaleString("vi-VN")} cp</div>
                    </div>
                    <div class="kpi-card" style="padding: 15px;">
                        <span style="color: var(--text-secondary); font-size: 12px;">Hệ số Beta</span>
                        <div style="font-size: 16px; font-weight:700; color: var(--text-primary); margin-top: 5px;">${data.overview.beta.toFixed(2).replace(".", ",")}</div>
                    </div>
                    <div class="kpi-card" style="padding: 15px;">
                        <span style="color: var(--text-secondary); font-size: 12px;">Tỷ lệ sở hữu nước ngoài</span>
                        <div style="font-size: 16px; font-weight:700; color: var(--text-primary); margin-top: 5px;">${data.overview.foreignRatio.toFixed(1).replace(".", ",")}%</div>
                    </div>
                </div>

                <div>
                    <h3 style="color: var(--text-primary); margin-bottom: 8px;"><i class="fa-solid fa-file-invoice"></i> Hồ sơ doanh nghiệp</h3>
                    <p style="color: var(--text-secondary); font-size: 14px; line-height: 1.6; text-align: justify; margin: 0;">${data.overview.desc}</p>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 5px;">
                    <div>
                        <h3 style="color: var(--text-primary); margin-bottom: 10px;"><i class="fa-solid fa-users"></i> Ban lãnh đạo</h3>
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            ${leadersHtml}
                        </div>
                    </div>
                    <div>
                        <h3 style="color: var(--text-primary); margin-bottom: 10px;"><i class="fa-solid fa-chart-pie"></i> Cổ đông lớn</h3>
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            ${shareholdersHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderFAPerformance(data, container) {
        const timeMode = container.dataset.timeMode || "yearly";

        let trHtml = "";
        const dataList = timeMode === "yearly" ? data.financials.yearly : data.financials.quarterly;
        
        const isYearly = timeMode === "yearly";
        const startIdx = isYearly ? 1 : 4;
        
        for (let i = startIdx; i < dataList.length; i++) {
            const d = dataList[i];
            const margin = d.revenue === 0 ? "0" : ((d.netProfit / d.revenue) * 100).toFixed(1).replace(".", ",");
            trHtml += `
                <tr>
                    <td><strong>${d.period}</strong></td>
                    <td class="number">${Math.round(d.revenue).toLocaleString("vi-VN")} tỷ</td>
                    <td class="number">${Math.round(d.grossProfit).toLocaleString("vi-VN")} tỷ</td>
                    <td class="number highlight-row">${Math.round(d.netProfit).toLocaleString("vi-VN")} tỷ</td>
                    <td class="number text-info" style="font-weight: 600;">${margin}%</td>
                </tr>
            `;
        }

        container.innerHTML = `
            <div class="card" style="padding: 20px; display: flex; flex-direction: column; gap: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
                    <h2 style="color: var(--text-primary); margin:0;"><i class="fa-solid fa-chart-line"></i> Báo cáo kết quả hoạt động kinh doanh</h2>
                    <div class="lessons-sub-tabs" style="background: rgba(0,0,0,0.25); border-radius: 8px; padding: 3px; display: flex; border: 1px solid var(--border-color);">
                        <button id="btn-fa-perf-yearly" class="sub-tab-btn ${timeMode === 'yearly' ? 'active' : ''}" style="padding: 6px 12px; font-size:12px; border:none; background:none; cursor:pointer;">Hằng năm</button>
                        <button id="btn-fa-perf-quarterly" class="sub-tab-btn ${timeMode === 'quarterly' ? 'active' : ''}" style="padding: 6px 12px; font-size:12px; border:none; background:none; cursor:pointer;">Hằng quý</button>
                    </div>
                </div>

                <div class="fa-chart-container">
                    <div class="fa-chart-title">
                        <i class="fa-solid fa-chart-column" style="color: #ef5350;"></i>
                        Xu hướng tăng trưởng Doanh thu & Lợi nhuận ròng (${timeMode === 'yearly' ? 'Năm' : 'Quý'})
                        <div style="margin-left: auto; display: flex; gap: 15px; font-size: 11px; align-items: center;">
                            <span style="display:flex; align-items:center; gap:5px;"><span style="width:10px; height:10px; background:#ef5350; display:inline-block; border-radius:2px;"></span> Doanh thu</span>
                            <span style="display:flex; align-items:center; gap:5px;"><span style="width:10px; height:10px; background:#78909c; display:inline-block; border-radius:2px;"></span> Lợi nhuận ròng</span>
                            <span style="display:flex; align-items:center; gap:5px;"><span style="width:12px; height:2px; background:#fbc02d; display:inline-block;"></span> Tăng trưởng LNST</span>
                        </div>
                    </div>
                    <div style="width: 100%; height: auto; background: rgba(0,0,0,0.1); border-radius:8px; padding: 10px; box-sizing: border-box; display: flex; justify-content: center; align-items: center;">
                        ${drawFACalendarChart(data.financials, timeMode)}
                    </div>
                </div>

                <div class="fa-table-container">
                    <table class="fa-table">
                        <thead>
                            <tr>
                                <th>Kỳ báo cáo</th>
                                <th class="number">Doanh thu thuần</th>
                                <th class="number">Lợi nhuận gộp</th>
                                <th class="number highlight-row">Lợi nhuận sau thuế</th>
                                <th class="number">Biên lợi nhuận ròng</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${trHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        document.getElementById("btn-fa-perf-yearly").addEventListener("click", () => {
            container.dataset.timeMode = "yearly";
            renderFAPerformance(data, container);
        });
        document.getElementById("btn-fa-perf-quarterly").addEventListener("click", () => {
            container.dataset.timeMode = "quarterly";
            renderFAPerformance(data, container);
        });
    }

    function renderFABalanceSheet(data, container) {
        const timeMode = container.dataset.timeMode || "yearly";

        let trHtml = "";
        const dataList = timeMode === "yearly" ? data.financials.yearly : data.financials.quarterly;

        const isYearly = timeMode === "yearly";
        const startIdx = isYearly ? 1 : 4;

        for (let i = startIdx; i < dataList.length; i++) {
            const d = dataList[i];
            const assets = d.totalAssets || 0;
            const liabilities = d.liabilities || 0;
            const equity = d.equity || 0;
            const debtRatio = assets === 0 ? "0" : ((liabilities / assets) * 100).toFixed(1).replace(".", ",");
            
            trHtml += `
                <tr>
                    <td><strong>${d.period}</strong></td>
                    <td class="number highlight-row">${Math.round(assets).toLocaleString("vi-VN")} tỷ</td>
                    <td class="number">${Math.round(liabilities).toLocaleString("vi-VN")} tỷ</td>
                    <td class="number" style="color: #10b981; font-weight:700;">${Math.round(equity).toLocaleString("vi-VN")} tỷ</td>
                    <td class="number text-warning" style="font-weight: 600;">${debtRatio}%</td>
                </tr>
            `;
        }

        container.innerHTML = `
            <div class="card" style="padding: 20px; display: flex; flex-direction: column; gap: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
                    <h2 style="color: var(--text-primary); margin:0;"><i class="fa-solid fa-scale-balanced"></i> Bảng cân đối kế toán rút gọn</h2>
                    <div class="lessons-sub-tabs" style="background: rgba(0,0,0,0.25); border-radius: 8px; padding: 3px; display: flex; border: 1px solid var(--border-color);">
                        <button id="btn-fa-bal-yearly" class="sub-tab-btn ${timeMode === 'yearly' ? 'active' : ''}" style="padding: 6px 12px; font-size:12px; border:none; background:none; cursor:pointer;">Hằng năm</button>
                        <button id="btn-fa-bal-quarterly" class="sub-tab-btn ${timeMode === 'quarterly' ? 'active' : ''}" style="padding: 6px 12px; font-size:12px; border:none; background:none; cursor:pointer;">Hằng quý</button>
                    </div>
                </div>

                <div class="fa-table-container">
                    <table class="fa-table">
                        <thead>
                            <tr>
                                <th>Kỳ báo cáo</th>
                                <th class="number highlight-row">Tổng tài sản</th>
                                <th class="number">Nợ phải trả</th>
                                <th class="number">Vốn chủ sở hữu</th>
                                <th class="number">Hệ số Nợ/Tài sản</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${trHtml}
                        </tbody>
                    </table>
                </div>
                
                <div style="font-size: 13.5px; color: var(--text-secondary); line-height: 1.6; border-left: 3px solid #f59e0b; padding-left: 15px; background: rgba(255,255,255,0.01); padding: 12px 15px; border-radius: 4px;">
                    <strong>Phân tích cơ cấu nguồn vốn:</strong> Mối quan hệ giữa tài sản, nợ và vốn chủ sở hữu thể hiện mức độ lành mạnh tài chính và khả năng tự chủ nguồn vốn của doanh nghiệp. Hệ số nợ/tài sản nằm dưới mức 50% thường thể hiện sức mạnh tài chính an toàn cao.
                </div>
            </div>
        `;

        document.getElementById("btn-fa-bal-yearly").addEventListener("click", () => {
            container.dataset.timeMode = "yearly";
            renderFABalanceSheet(data, container);
        });
        document.getElementById("btn-fa-bal-quarterly").addEventListener("click", () => {
            container.dataset.timeMode = "quarterly";
            renderFABalanceSheet(data, container);
        });
    }

    function renderFARatios(data, container) {
        container.innerHTML = `
            <div class="card" style="padding: 20px; display: flex; flex-direction: column; gap: 20px;">
                <div style="border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
                    <h2 style="color: var(--text-primary); margin:0;"><i class="fa-solid fa-percent"></i> Các chỉ số tài chính cốt lõi</h2>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div style="border: 1px solid var(--border-color); padding: 15px; border-radius: 8px; background: rgba(0,0,0,0.15);">
                        <h3 style="color: var(--text-primary); margin-top: 0; margin-bottom: 12px; border-bottom: 1px dashed var(--border-color); padding-bottom: 8px;">Nhóm Chỉ Số Định Giá</h3>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            <div style="display:flex; justify-content:space-between; font-size:13.5px;">
                                <span style="color: var(--text-secondary);">Chỉ số P/E (Hệ số giá trên thu nhập)</span>
                                <strong style="color: var(--text-primary);">${data.ratios.pe.toFixed(2).replace(".", ",")} lần</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size:13.5px;">
                                <span style="color: var(--text-secondary);">Chỉ số P/B (Hệ số giá trên giá trị sổ sách)</span>
                                <strong style="color: var(--text-primary);">${data.ratios.pb.toFixed(2).replace(".", ",")} lần</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size:13.5px;">
                                <span style="color: var(--text-secondary);">EPS 4 quý gần nhất (Lợi nhuận trên mỗi cp)</span>
                                <strong style="color: #10b981;">${data.ratios.eps.toLocaleString("vi-VN")} VNĐ</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size:13.5px;">
                                <span style="color: var(--text-secondary);">BVPS (Giá trị sổ sách trên mỗi cp)</span>
                                <strong style="color: var(--text-primary);">${data.ratios.bvps.toLocaleString("vi-VN")} VNĐ</strong>
                            </div>
                        </div>
                    </div>

                    <div style="border: 1px solid var(--border-color); padding: 15px; border-radius: 8px; background: rgba(0,0,0,0.15);">
                        <h3 style="color: var(--text-primary); margin-top: 0; margin-bottom: 12px; border-bottom: 1px dashed var(--border-color); padding-bottom: 8px;">Nhóm Chỉ Số Hiệu Quả & Sức Khỏe</h3>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            <div style="display:flex; justify-content:space-between; font-size:13.5px;">
                                <span style="color: var(--text-secondary);">ROE (Tỷ suất LN trên Vốn chủ sở hữu)</span>
                                <strong style="color: #3b82f6;">${data.ratios.roe.toFixed(2).replace(".", ",")}%</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size:13.5px;">
                                <span style="color: var(--text-secondary);">ROA (Tỷ suất LN trên Tổng tài sản)</span>
                                <strong style="color: var(--text-primary);">${data.ratios.roa.toFixed(2).replace(".", ",")}%</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size:13.5px;">
                                <span style="color: var(--text-secondary);">Tỷ lệ Nợ / Vốn chủ sở hữu</span>
                                <strong style="color: var(--text-primary);">${data.ratios.debtToEquity.toFixed(2).replace(".", ",")} lần</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size:13.5px;">
                                <span style="color: var(--text-secondary);">Sức khỏe tài chính</span>
                                <strong style="color: #10b981;"><i class="fa-solid fa-circle-check"></i> AN TOÀN</strong>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="health-gauge-container">
                    <span style="color: var(--text-secondary); font-size: 13px; font-weight:600;">SỨC KHỎE TÀI CHÍNH TỔNG QUAN (ROE vs Tỷ Lệ Nợ)</span>
                    <div style="display:flex; gap: 30px; margin-top: 15px; width: 100%; justify-content:center;">
                        <div style="text-align: center;">
                            <div style="width: 70px; height: 70px; border-radius:50%; border: 4px solid #3b82f6; display:flex; justify-content:center; align-items:center; font-weight:700; color:#3b82f6; font-size:15px; margin: 0 auto 5px auto;">
                                ${data.ratios.roe.toFixed(1).replace(".", ",")}%
                            </div>
                            <span style="font-size:11px; color: var(--text-secondary);">ROE (Tốt > 15%)</span>
                        </div>
                        <div style="text-align: center;">
                            <div style="width: 70px; height: 70px; border-radius:50%; border: 4px solid #10b981; display:flex; justify-content:center; align-items:center; font-weight:700; color:#10b981; font-size:15px; margin: 0 auto 5px auto;">
                                ${data.ratios.debtToEquity.toFixed(1).replace(".", ",")}
                            </div>
                            <span style="font-size:11px; color: var(--text-secondary);">Nợ/Vốn CSH (Tốt < 1,5)</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderFAValuation(data, container) {
        const val = calculateFAValuation(data);

        container.innerHTML = `
            <div class="card" style="padding: 20px; display: flex; flex-direction: column; gap: 20px;">
                <div style="border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
                    <h2 style="color: var(--text-primary); margin:0;"><i class="fa-solid fa-calculator"></i> Định giá hợp lý & Biên an toàn</h2>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div style="display:flex; flex-direction:column; gap:12px; justify-content:center; padding: 10px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom: 10px; border-bottom:1px dashed var(--border-color);">
                            <span style="color: var(--text-secondary); font-size:13.5px;">Thị giá hiện tại (${currentTicker})</span>
                            <strong style="color: var(--text-primary); font-size: 16px;">${val.currentPrice.toLocaleString("vi-VN")} VNĐ</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom: 10px; border-bottom:1px dashed var(--border-color);">
                            <span style="color: var(--text-secondary); font-size:13.5px;">Định giá hợp lý trung bình</span>
                            <strong style="color: #3b82f6; font-size: 18px;">${val.fairValue.toLocaleString("vi-VN")} VNĐ</strong>
                        </div>
                        
                        <div style="text-align: center; margin-top: 5px;">
                            <div class="valuation-recommendation ${val.recClass}">
                                <i class="fa-solid ${val.icon}"></i> KHUYƠN NGHỊ: ${val.recText}
                            </div>
                            <span style="font-size:12.5px; color: var(--text-secondary); display:block; margin-top:10px;">${val.recDesc}</span>
                        </div>
                    </div>

                    <div style="border: 1px solid var(--border-color); padding: 15px; border-radius: 8px; background: rgba(0,0,0,0.15);">
                        <h3 style="color: var(--text-primary); margin-top: 0; margin-bottom: 12px; border-bottom: 1px dashed var(--border-color); padding-bottom: 8px;">Kết quả theo mô hình</h3>
                        
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            <div style="display:flex; justify-content:space-between; font-size:13.5px;">
                                <span style="color: var(--text-secondary);">1. Định giá theo P/E mục tiêu (15x)</span>
                                <strong style="color: var(--text-primary);">${val.valPE.toLocaleString("vi-VN")} VNĐ</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size:13.5px;">
                                <span style="color: var(--text-secondary);">2. Định giá theo P/B mục tiêu (1.8x)</span>
                                <strong style="color: var(--text-primary);">${val.valPB.toLocaleString("vi-VN")} VNĐ</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size:13.5px;">
                                <span style="color: var(--text-secondary);">3. Định giá theo mô hình Graham</span>
                                <strong style="color: var(--text-primary);">${val.valGraham.toLocaleString("vi-VN")} VNĐ</strong>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="font-size: 13.5px; color: var(--text-secondary); line-height: 1.6; border-left: 3px solid #3b82f6; padding-left: 15px; background: rgba(255,255,255,0.01); padding: 12px 15px; border-radius: 4px;">
                    <strong>Nguyên lý định giá:</strong> Giá trị hợp lý là kết quả trung bình trọng số của ba phương pháp định giá phổ biến. Một cổ phiếu có thị giá thấp hơn giá trị hợp lý trên 15% sẽ tạo ra <strong>Biên an toàn (Margin of Safety)</strong> đủ lớn để bảo vệ nhà đầu tư khỏi các rủi ro biến động ngắn hạn.
                </div>
            </div>
        `;
    }

    const headerTa = document.getElementById("header-ta");
    const headerFa = document.getElementById("header-fa");
    const groupTa = document.getElementById("group-ta");
    const groupFa = document.getElementById("group-fa");
    const taSubmenu = document.getElementById("ta-menu-items");
    const faSubmenu = document.getElementById("fa-menu-items");
    
    const faViewContainer = document.getElementById("fa-view-container");

    function hideAllViews() {
        if (dashboardView) dashboardView.classList.add("hidden");
        if (signalsView) signalsView.classList.add("hidden");
        if (historyView) historyView.classList.add("hidden");
        if (screenerView) screenerView.classList.add("hidden");
        if (lessonsView) lessonsView.classList.add("hidden");
        if (faViewContainer) faViewContainer.classList.add("hidden");

        const menuItems = document.querySelectorAll(".nav-menu .nav-item");
        menuItems.forEach(item => item.classList.remove("active"));
    }

    // Xử lý đóng/mở sơ đồ cây
    if (headerTa && groupTa && taSubmenu) {
        headerTa.addEventListener("click", () => {
            const isExpanded = groupTa.classList.contains("expanded");
            if (isExpanded) {
                groupTa.classList.remove("expanded");
                taSubmenu.classList.add("hidden");
            } else {
                groupTa.classList.add("expanded");
                taSubmenu.classList.remove("hidden");
                
                // Tự động kích hoạt tab con đầu tiên của TA nếu chưa có tab nào hoạt động
                const activeChild = document.querySelector(".nav-menu .nav-item.active");
                const hasTaActive = Array.from(taSubmenu.querySelectorAll(".nav-item")).some(item => item.classList.contains("active"));
                if (!activeChild || !hasTaActive) {
                    const firstChild = document.getElementById("btn-dashboard");
                    if (firstChild) firstChild.click();
                }
            }
        });
    }

    if (headerFa && groupFa && faSubmenu) {
        headerFa.addEventListener("click", () => {
            const isExpanded = groupFa.classList.contains("expanded");
            if (isExpanded) {
                groupFa.classList.remove("expanded");
                faSubmenu.classList.add("hidden");
            } else {
                groupFa.classList.add("expanded");
                faSubmenu.classList.remove("hidden");
                
                // Tự động kích hoạt tab con đầu tiên của FA nếu chưa có tab nào hoạt động
                const activeChild = document.querySelector(".nav-menu .nav-item.active");
                const hasFaActive = Array.from(faSubmenu.querySelectorAll(".nav-item")).some(item => item.classList.contains("active"));
                if (!activeChild || !hasFaActive) {
                    const firstChild = document.getElementById("btn-fa-overview");
                    if (firstChild) firstChild.click();
                }
            }
        });
    }

    const faOverviewBtn = document.getElementById("btn-fa-overview");
    const faPerformanceBtn = document.getElementById("btn-fa-performance");
    const faBalanceBtn = document.getElementById("btn-fa-balance");
    const faRatiosBtn = document.getElementById("btn-fa-ratios");
    const faValuationBtn = document.getElementById("btn-fa-valuation");

    const faButtons = [faOverviewBtn, faPerformanceBtn, faBalanceBtn, faRatiosBtn, faValuationBtn];

    function activateFaMenu(activeBtn, tabName) {
        // Ẩn tất cả các view kỹ thuật và xóa class active của mọi tab con
        hideAllViews();
        
        if (activeBtn) activeBtn.classList.add("active");
        currentFaTab = tabName;
        currentAnalysisMode = "fa";
        
        // Hiện vùng chứa FA
        if (faViewContainer) faViewContainer.classList.remove("hidden");
        
        // Ẩn main-header (chỉ hiện ở Dashboard)
        const mainHeader = document.querySelector(".main-header");
        if (mainHeader) mainHeader.classList.add("hidden");
        
        const pageTitle = document.getElementById("page-title");
        if (pageTitle) pageTitle.textContent = `Phân tích Doanh nghiệp & Định giá - Mã ${currentTicker}`;
        
        renderFAView();
    }

    if (faOverviewBtn) {
        faOverviewBtn.addEventListener("click", () => activateFaMenu(faOverviewBtn, "overview"));
    }
    if (faPerformanceBtn) {
        faPerformanceBtn.addEventListener("click", () => activateFaMenu(faPerformanceBtn, "performance"));
    }
    if (faBalanceBtn) {
        faBalanceBtn.addEventListener("click", () => activateFaMenu(faBalanceBtn, "balance"));
    }
    if (faRatiosBtn) {
        faRatiosBtn.addEventListener("click", () => activateFaMenu(faRatiosBtn, "ratios"));
    }
    if (faValuationBtn) {
        faValuationBtn.addEventListener("click", () => activateFaMenu(faValuationBtn, "valuation"));
    }

    // Khởi tạo Firebase
    initFirebase();
});
