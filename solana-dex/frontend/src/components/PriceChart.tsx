"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";

const INDEXER_URL =
  process.env.NEXT_PUBLIC_INDEXER_URL || "http://localhost:3001";

const INTERVALS = ["1m", "5m", "15m", "1h", "4h", "1D"] as const;
type Interval = (typeof INTERVALS)[number];

const LOOKBACK_MS: Record<Interval, number> = {
  "1m": 24 * 60 * 60 * 1000,
  "5m": 2 * 24 * 60 * 60 * 1000,
  "15m": 4 * 24 * 60 * 60 * 1000,
  "1h": 7 * 24 * 60 * 60 * 1000,
  "4h": 30 * 24 * 60 * 60 * 1000,
  "1D": 180 * 24 * 60 * 60 * 1000,
};

interface CandleRaw {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface PriceChartProps {
  poolAddress: string;
  height?: number;
}

function PriceChartInner({ poolAddress, height = 400 }: PriceChartProps) {
  const [selectedInterval, setSelectedInterval] = useState<Interval>("1h");
  const [loading, setLoading] = useState(true);
  const [isEmpty, setIsEmpty] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candleSeriesRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const volumeSeriesRef = useRef<any>(null);
  const visibleRef = useRef(true);

  // Fetch candles
  const fetchCandles = useCallback(async (): Promise<CandleRaw[]> => {
    const now = Date.now();
    const from = Math.floor((now - LOOKBACK_MS[selectedInterval]) / 1000);
    const to = Math.floor(now / 1000);
    const apiInterval = selectedInterval === "1D" ? "1d" : selectedInterval;
    const url = `${INDEXER_URL}/api/candles?pool=${poolAddress}&interval=${apiInterval}&from=${from}&to=${to}`;

    try {
      const res = await fetch(url);
      if (!res.ok) return [];
      const json = await res.json();
      const data = json.data || json || [];
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }, [poolAddress, selectedInterval]);

  // Create chart (lazy import)
  useEffect(() => {
    if (!containerRef.current) return;

    let chart: ReturnType<typeof import("lightweight-charts").createChart>;
    let resizeObserver: ResizeObserver;

    import("lightweight-charts").then(({ createChart }) => {
      if (!containerRef.current) return;

      chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height,
        layout: {
          background: { color: "#0a0a1a" },
          textColor: "#9ca3af",
        },
        grid: {
          vertLines: { color: "#1a1a2e" },
          horzLines: { color: "#1a1a2e" },
        },
        crosshair: {
          mode: 0,
          vertLine: { color: "#4b5563" },
          horzLine: { color: "#4b5563" },
        },
        timeScale: {
          borderColor: "#1a1a2e",
          timeVisible: true,
        },
        rightPriceScale: {
          borderColor: "#1a1a2e",
        },
      });

      const candleSeries = chart.addCandlestickSeries({
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderUpColor: "#22c55e",
        borderDownColor: "#ef4444",
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
      });

      const volumeSeries = chart.addHistogramSeries({
        priceScaleId: "volume",
      });

      chart.priceScale("volume").applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });

      chartRef.current = chart;
      candleSeriesRef.current = candleSeries;
      volumeSeriesRef.current = volumeSeries;

      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          chart.applyOptions({ width: entry.contentRect.width });
        }
      });
      resizeObserver.observe(containerRef.current);
    });

    return () => {
      resizeObserver?.disconnect();
      chart?.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [height]);

  // Pause polling when tab is hidden
  useEffect(() => {
    const handler = () => {
      visibleRef.current = !document.hidden;
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  // Load & refresh data
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      if (!visibleRef.current) return;

      setLoading(true);
      const candles = await fetchCandles();
      if (cancelled) return;

      setIsEmpty(candles.length === 0);

      if (candleSeriesRef.current && volumeSeriesRef.current) {
        const candleData = candles.map((c) => ({
          time: c.time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));

        const volumeData = candles.map((c) => ({
          time: c.time,
          value: c.volume,
          color:
            c.close >= c.open
              ? "rgba(34, 197, 94, 0.3)"
              : "rgba(239, 68, 68, 0.3)",
        }));

        candleSeriesRef.current.setData(candleData);
        volumeSeriesRef.current.setData(volumeData);
        chartRef.current?.timeScale().fitContent();
      }
      setLoading(false);
    };

    // Small delay to allow chart initialization
    const initTimeout = setTimeout(loadData, 100);

    const interval = setInterval(loadData, 10_000);
    return () => {
      cancelled = true;
      clearTimeout(initTimeout);
      clearInterval(interval);
    };
  }, [fetchCandles]);

  return (
    <div className="bg-dark-900 border border-dark-700 rounded-2xl overflow-hidden">
      {/* Interval selector */}
      <div className="flex items-center gap-1 p-3 border-b border-dark-700">
        {INTERVALS.map((iv) => (
          <button
            key={iv}
            onClick={() => setSelectedInterval(iv)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedInterval === iv
                ? "bg-primary-600 text-white"
                : "text-dark-400 hover:text-white hover:bg-dark-800"
            }`}
          >
            {iv}
          </button>
        ))}
      </div>

      {/* Chart container */}
      <div className="relative" style={{ height }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-dark-900/80">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-dark-400">Loading chart...</span>
            </div>
          </div>
        )}
        {!loading && isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-2 text-dark-400">
              <svg
                className="w-10 h-10"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <span className="text-sm">No chart data available</span>
              <span className="text-xs">
                Trade activity will appear here once the indexer is running
              </span>
            </div>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}

// Lazy-load the chart component (lightweight-charts is ~50KB)
const PriceChart = dynamic(() => Promise.resolve(PriceChartInner), {
  ssr: false,
  loading: () => (
    <div className="bg-dark-900 border border-dark-700 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-1 p-3 border-b border-dark-700">
        {["1m", "5m", "15m", "1h", "4h", "1D"].map((iv) => (
          <div
            key={iv}
            className="px-3 py-1.5 rounded-lg text-sm text-dark-600"
          >
            {iv}
          </div>
        ))}
      </div>
      <div className="h-[400px] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  ),
});

export default PriceChart;
