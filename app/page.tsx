'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Activity, AlertTriangle, BarChart3, Bell, CalendarDays, ChevronDown, ChevronRight,
  CircleHelp, Droplets, Gauge, Info, MapPin, Maximize2, Menu, Play, RotateCcw, Search, Settings,
  SlidersHorizontal, Sparkles, Thermometer, TrendingDown, TrendingUp, Waves, X, Zap,
} from 'lucide-react'

type Phase = 'Injection Phase' | 'Soak Phase' | 'Production Phase'
type Scenario = { steam: number; pressure: number; temperature: number; duration: number; soak: number; pump: number; stroke: number }

const wellNames = ['BW-01', 'BW-02', 'BW-03', 'BW-04', 'BW-05', 'BW-06', 'BW-07', 'BW-08', 'BW-09', 'BW-10']
const navItems = ['Simulator', 'Recommendations', 'Well Overview', 'Field Insights', 'Data & Reports']
const wellProfiles: Record<string, { oil: number; temp: number; viscosity: number; pressure: number; pumpLoad: number; waterCut: number; depth: number; phase: Phase; confidence: number }> = {
  'BW-01': { oil: 12.4, temp: 136, viscosity: 760, pressure: 16, pumpLoad: 61, waterCut: 18, depth: 1180, phase: 'Production Phase', confidence: 82 },
  'BW-02': { oil: 16.8, temp: 142, viscosity: 710, pressure: 17, pumpLoad: 64, waterCut: 15, depth: 1214, phase: 'Soak Phase', confidence: 85 },
  'BW-03': { oil: 18.2, temp: 149, viscosity: 665, pressure: 19, pumpLoad: 71, waterCut: 11, depth: 1238, phase: 'Production Phase', confidence: 89 },
  'BW-04': { oil: 9.6, temp: 121, viscosity: 845, pressure: 15, pumpLoad: 79, waterCut: 24, depth: 1165, phase: 'Injection Phase', confidence: 74 },
  'BW-05': { oil: 21.3, temp: 158, viscosity: 548, pressure: 21, pumpLoad: 66, waterCut: 9, depth: 1292, phase: 'Production Phase', confidence: 93 },
  'BW-06': { oil: 17.5, temp: 154, viscosity: 595, pressure: 20, pumpLoad: 69, waterCut: 13, depth: 1276, phase: 'Soak Phase', confidence: 88 },
  'BW-07': { oil: 20.8, temp: 152, viscosity: 620, pressure: 18, pumpLoad: 68, waterCut: 12, depth: 1248, phase: 'Injection Phase', confidence: 87 },
  'BW-08': { oil: 14.1, temp: 131, viscosity: 802, pressure: 16, pumpLoad: 73, waterCut: 20, depth: 1198, phase: 'Production Phase', confidence: 79 },
  'BW-09': { oil: 11.7, temp: 128, viscosity: 890, pressure: 14, pumpLoad: 84, waterCut: 27, depth: 1142, phase: 'Injection Phase', confidence: 68 },
  'BW-10': { oil: 22.2, temp: 161, viscosity: 512, pressure: 22, pumpLoad: 63, waterCut: 8, depth: 1310, phase: 'Production Phase', confidence: 95 },
}

// Visible random nudge — large enough to see on screen every tick
const nudge = (v: number, pct = 0.04) => Math.round((v + v * (Math.random() - 0.5) * pct) * 10) / 10;
const nudgeInt = (v: number, pct = 0.05) => Math.round(v + v * (Math.random() - 0.5) * pct);

type LiveWell = { oil: number; temp: number; viscosity: number; pressure: number; pumpLoad: number; waterCut: number };
type LiveField = Record<string, LiveWell>;

function useLiveField(): [LiveField, number] {
  const [tick, setTick] = useState(0);
  const [liveData, setLiveData] = useState<LiveField>(() =>
    Object.fromEntries(wellNames.map(n => [n, {
      oil: wellProfiles[n].oil,
      temp: wellProfiles[n].temp,
      viscosity: wellProfiles[n].viscosity,
      pressure: wellProfiles[n].pressure,
      pumpLoad: wellProfiles[n].pumpLoad,
      waterCut: wellProfiles[n].waterCut,
    }]))
  );
  useEffect(() => {
    const t = setInterval(() => {
      setTick(k => k + 1);
      setLiveData(prev => Object.fromEntries(wellNames.map(n => {
        return [n, {
          oil: Math.max(0.5, nudge(prev[n].oil, 0.06)),
          temp: Math.max(80, nudgeInt(prev[n].temp, 0.04)),
          viscosity: Math.max(200, nudgeInt(prev[n].viscosity, 0.05)),
          pressure: Math.max(8, nudge(prev[n].pressure, 0.04)),
          pumpLoad: Math.min(99, Math.max(30, nudgeInt(prev[n].pumpLoad, 0.05))),
          waterCut: Math.min(60, Math.max(2, nudge(prev[n].waterCut, 0.06))),
        }];
      })));
    }, 1500);
    return () => clearInterval(t);
  }, []);
  return [liveData, tick];
}

function useClock() {
  const now = new Date();
  const [clock, setClock] = useState(`${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`);
  useEffect(() => {
    const t = setInterval(() => {
      const d = new Date();
      setClock(`${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`);
    }, 1000);
    return () => clearInterval(t);
  }, []);
  return clock;
}

function MiniChart({ color, label, points, suffix = '' }: { color: string; label: string; points: number[]; suffix?: string }) {
  // Generate a plausible "Current/Do-Nothing" baseline that drifts slightly lower over time
  const currentPoints = points.map((v, i) => points[0] - (Math.abs(points[0]) * 0.05 * (i / (points.length - 1 || 1))));
  
  const minVal = Math.min(...points, ...currentPoints);
  const maxVal = Math.max(...points, ...currentPoints);
  const range = maxVal - minVal || 1;
  const min = minVal - range * 0.15; // Add vertical padding
  const max = maxVal + range * 0.15;
  const adjRange = max - min;

  // Calculate coordinates (padding left/right by 3% so circles don't clip horizontally)
  const getX = (i: number) => 3 + (i / (points.length - 1)) * 94;
  const getY = (val: number) => 88 - ((val - min) / adjRange) * 76; // Spans from y=12 to y=88

  // Build a cubic bezier curve for smoother lines
  const buildCurve = (data: number[]) => {
    let d = `M ${getX(0)} ${getY(data[0])}`;
    for (let i = 0; i < data.length - 1; i++) {
      const x1 = getX(i); const y1 = getY(data[i]);
      const x2 = getX(i + 1); const y2 = getY(data[i + 1]);
      const cp1x = x1 + (x2 - x1) * 0.5;
      const cp2x = x1 + (x2 - x1) * 0.5;
      d += ` C ${cp1x} ${y1}, ${cp2x} ${y2}, ${x2} ${y2}`;
    }
    return d;
  };

  const linePath = buildCurve(points);
  const currentLinePath = buildCurve(currentPoints);
  const areaPath = `${linePath} L 97,95 L 3,95 Z`; // Close the path for the filled area

  return (
    <div className="trend-card">
      <div className="trend-title">
        <b>{label}</b>
        <span>{points.at(-1)}{suffix}</span>
      </div>
      <svg viewBox="0 0 100 100" className="trend-svg" role="img" aria-label={`${label} projected trend`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`fill-${label.replace(/[^a-z]/gi, '')}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity=".35" />
            <stop offset="1" stopColor={color} stopOpacity=".0" />
          </linearGradient>
          <filter id="glow">
             <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
             <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
             </feMerge>
          </filter>
        </defs>
        {/* Grid lines */}
        <line x1="0" y1="12" x2="100" y2="12" stroke="#edf1f5" strokeWidth="0.5" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="#edf1f5" strokeWidth="0.5" />
        <line x1="0" y1="88" x2="100" y2="88" stroke="#d9e1eb" strokeWidth="0.5" />
        
        {/* Paths */}
        <path d={areaPath} fill={`url(#fill-${label.replace(/[^a-z]/gi, '')})`} />
        <path d={currentLinePath} fill="none" stroke="#9aa7b7" strokeWidth="1.2" strokeDasharray="2 2" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />
        
        {/* Data points - Only start and end for a clean professional look */}
        <circle cx={getX(0)} cy={getY(points[0])} r="2" fill="#fff" stroke={color} strokeWidth="1.5" />
        <circle cx={getX(points.length - 1)} cy={getY(points[points.length - 1])} r="2.5" fill={color} stroke="#fff" strokeWidth="1.5" filter="url(#glow)" />
      </svg>
      <div className="trend-axis">
        <span>0d</span><span>10d</span><span>20d</span><span>30d</span>
      </div>
      <div className="trend-legend">
        <span><i style={{ background: color }} />Projected</span>
        <span><i className="dashed" />Current</span>
      </div>
    </div>
  )
}

function SimulationCanvas({ phase, running, onToggle, well, profile, day, setDay }: { phase: Phase; running: boolean; onToggle: () => void; well: string; profile: typeof baseline; day: number; setDay: (day: number) => void }) {
  const [activeTab, setActiveTab] = useState('3D Well View')
  const tabs = ['3D Well View', 'Reservoir View', 'Temperature Map', 'Profiles']

  // Current phase based on slider position (no auto-advance)
  const currentPhase = day <= 16 ? 'Injection' : day <= 18 ? 'Soak' : day <= 30 ? 'Production' : 'Cooling'

  return <div className={`simulation-canvas-v2 ${running ? 'running' : ''}`}>
    {/* TOP: Tab bar */}
    <div className="sim-header">
      <div className="sim-tabs">
        {tabs.map(t => <button key={t} className={activeTab === t ? 'active' : ''} onClick={() => setActiveTab(t)}>{t}</button>)}
      </div>
      <button className="icon-btn" title="Fullscreen"><Maximize2 size={16} /></button>
    </div>

    {/* Background image - full fit (Always visible) */}
    <div className="sim-img-wrap">
      <img src="/well-render.jpg" alt="3D Well Cross-Section View" className="sim-bg" />
      {/* Overlay gradient bottom for footer readability */}
      <div className="sim-img-gradient" />
    </div>

    {/* Absolute positioned labels matching reference image (Always visible) */}
    <div className="sim-labels">
      <div className="label-item l-wellhead"><span className="label-text">Wellhead</span><span className="label-dash"></span><span className="label-dot"></span></div>
      <div className="label-item l-injection"><span className="label-text">Injection Line</span><span className="label-dash"></span><span className="label-dot"></span></div>
      <div className="label-item l-casing"><span className="label-text">Casing</span><span className="label-dash"></span><span className="label-dot"></span></div>
      <div className="label-item l-tubing"><span className="label-text">Production Tubing</span><span className="label-dash"></span><span className="label-dot"></span></div>
      <div className="label-item l-jodhpur"><span className="label-text">Jodhpur Sandstone</span><span className="label-dash"></span><span className="label-dot"></span></div>
      <div className="label-item l-payzone"><span className="label-text">Pay Zone</span><span className="label-dash"></span><span className="label-dot"></span></div>
    </div>

    {activeTab === 'Reservoir View' && (
      <div className="sim-special-view reservoir-view">
        <div className="res-grid"></div>
        <div className="res-wellbore"></div>
        <div className="res-fluid-front" style={{ 
          transform: `scale(${1 + day / 6})`, 
          opacity: currentPhase === 'Injection' ? 0.7 : (currentPhase === 'Soak' ? 0.5 : 0.2),
          background: currentPhase === 'Injection' ? 'radial-gradient(circle, rgba(94, 162, 243, 0.8) 0%, rgba(94, 162, 243, 0.2) 70%, transparent 100%)' : 'radial-gradient(circle, rgba(51, 72, 99, 0.6) 0%, rgba(51, 72, 99, 0) 70%, transparent 100%)'
        }}></div>
        <div className="res-oil-flow" style={{ 
          opacity: currentPhase === 'Production' ? (day - 18) / 12 : 0,
          transform: `scale(${1 + (day > 18 ? (30 - day) / 6 : 0)})`
        }}></div>
        <div className="sim-info-overlay">
          <h3>Fluid Saturation & Flow</h3>
          <p>Phase: <strong>{currentPhase}</strong></p>
          <p>Radial Extent: <strong>{(day * 1.8).toFixed(1)} m</strong></p>
          <p>Flow Velocity: <strong>{currentPhase === 'Production' ? ((day-18)*0.2).toFixed(2) : '0.00'} m/d</strong></p>
        </div>
      </div>
    )}

    {activeTab === 'Temperature Map' && (
      <div className="sim-special-view temp-map-view">
        <div className="res-grid dark"></div>
        <div className="heat-zone" style={{ 
          transform: `scale(${1 + (day <= 16 ? day / 3.5 : 16 / 3.5 + (day - 16) / 8)})`,
          opacity: day <= 16 ? 0.9 : (day <= 18 ? 0.8 : Math.max(0.4, 0.8 - (day - 18) / 30)),
          background: `radial-gradient(circle, ${day <= 16 ? '#ff3300' : '#ff9900'} 0%, ${day <= 16 ? 'rgba(255, 102, 0, 0.6)' : 'rgba(255, 153, 0, 0.4)'} 40%, transparent 70%)`
        }}></div>
        <div className="res-wellbore hot"></div>
        <div className="sim-info-overlay">
          <h3>Thermal Front Expansion</h3>
          <p>Max Temperature: <strong>{day <= 16 ? Math.round(profile.temp + (310 - profile.temp) * (day/16)) : Math.round(310 - (day - 16) * 4)}°C</strong></p>
          <p>Heated Volume: <strong>{Math.round(100 + Math.pow(day, 2.2))} m³</strong></p>
        </div>
      </div>
    )}

    {activeTab === 'Profiles' && (
      <div className="sim-special-view profiles-view">
        <div className="profile-container">
          <div className="profile-column">
            <h4>Temperature</h4>
            <div className="profile-bar">
              <div className="profile-fill temp-fill" style={{ 
                height: `${currentPhase === 'Injection' ? 100 : currentPhase === 'Soak' ? 80 - (day-16)*5 : Math.max(40, 70 - (day-18)*2)}%`,
                background: `linear-gradient(to bottom, #ff9900, ${day <= 16 ? '#ff3300' : '#ffcc00'})`,
                opacity: day <= 16 ? 0.9 : 0.7
              }}></div>
            </div>
            <span className="profile-val">{day <= 16 ? Math.round(profile.temp + (310 - profile.temp) * (day/16)) : Math.round(310 - (day - 16) * 4)}°C</span>
          </div>
          <div className="profile-column">
            <h4>Pressure</h4>
            <div className="profile-bar">
              <div className="profile-fill press-fill" style={{ 
                height: `${currentPhase === 'Injection' ? 80 + day*1.2 : currentPhase === 'Soak' ? 99 : Math.max(40, 99 - (day-18)*3)}%`,
                background: `linear-gradient(to bottom, #3498db, #2980b9)`
              }}></div>
            </div>
            <span className="profile-val">{currentPhase === 'Injection' ? Math.round(18 + day * 0.5) : currentPhase === 'Soak' ? 26 : Math.round(26 - (day-18)*0.5)} bar</span>
          </div>
        </div>
        <div className="sim-info-overlay">
          <h3>Vertical Well Profiles</h3>
          <p>Cross-sectional temperature and pressure gradients along the wellbore depth.</p>
          <p>Target Depth: <strong>{profile.depth}m</strong></p>
        </div>
      </div>
    )}

    {/* RIGHT: Temperature legend */}
    <div className="sim-legend">
      <p className="legend-title">Temperature (°C)</p>
      <div className="legend-scale">
        <div className="legend-ticks">
          <span>300</span><span>250</span><span>200</span><span>150</span><span>100</span><span>50</span>
        </div>
        <div className="gradient-bar" />
      </div>
    </div>

    {/* BOTTOM: Interactive timeline footer */}
    <div className="sim-footer-v2">
      <button className="play-btn" onClick={onToggle} aria-label={running ? 'Pause' : 'Play'}>
        {running
          ? <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          : <Play fill="currentColor" size={18} />}
      </button>

      <div className="timeline-container">
        {/* Top row: label + tick numbers */}
        <div className="tl-top-row">
          <span className="tl-label">Time (days)</span>
          <div className="tl-ticks">
            <span>0</span><span>10</span><span>20</span><span>30</span>
          </div>
        </div>

        {/* Slider + colored phase bar */}
        <div className="tl-slider-wrap">
          <div className="tl-phase-track">
            <span className="tp-inj"  style={{width:'53.3%'}} />
            <span className="tp-soak" style={{width:'6.7%'}} />
            <span className="tp-prod" style={{width:'40%'}} />
          </div>
          <input
            type="range" min={0} max={30} step={1}
            value={day}
            onChange={e => setDay(Number(e.target.value))}
            className="tl-range"
          />
        </div>

        {/* Phase labels below the track */}
        <div className="tl-phase-labels">
          <span className="tpl-inj">Injection<br/><small>(0–16 days)</small></span>
          <span className="tpl-soak">Soak<br/><small>(16–18 days)</small></span>
          <span className="tpl-prod">Production<br/><small>(18–30 days)</small></span>
          <span className="tpl-cool">Cooling<br/><small>(30+ days)</small></span>
        </div>
      </div>

      <div className="speed-control">
        <span>1x</span><ChevronDown size={13}/>
      </div>
    </div>
  </div>
}


function MetricCard({ icon, label, value, detail, current }: { icon: ReactNode; label: string; value: string; detail: string; current: string }) {
  return <div className="metric-card"><div className="metric-label">{icon}<span>{label}</span></div><strong className="positive">{value}</strong><b>{detail}</b><small>(Current: {current})</small></div>
}

function Simulator({ well, notify, liveData, tick }: { well: string; notify: (message: string) => void; liveData: LiveField; tick: number }) {
  const profile = wellProfiles[well]
  const live = liveData[well] || profile;
  const [phase, setPhase] = useState<Phase>(profile.phase); const [running, setRunning] = useState(false)
  const [day, setDay] = useState(0)
  const [scenario, setScenario] = useState<Scenario>({ steam: Math.round(145 + profile.oil * 1.1), pressure: profile.pressure, temperature: Math.round(profile.temp + 128), duration: 16, soak: 48, pump: Math.max(3, Math.round(profile.pumpLoad / 12)), stroke: Math.round(72 + profile.pumpLoad / 5) })
  const update = (key: keyof Scenario, value: number) => setScenario((s) => ({ ...s, [key]: value }))
  const reset = () => { setScenario({ steam: 160, pressure: 18, temperature: 280, duration: 16, soak: 48, pump: 6, stroke: 86 }); setRunning(false); setDay(0); notify('Scenario reset to current conditions') }
  const forecast = useMemo(() => { const heatGain = (scenario.temperature - 200) / 80; const steamGain = (scenario.steam - 50) / 250; const pressureGain = (scenario.pressure - 10) / 30; const production = profile.oil + 1.8 + heatGain * 3.1 + steamGain * 2.2 + pressureGain * 1.2; const viscosity = Math.max(360, profile.viscosity - heatGain * 190 - steamGain * 55); const load = Math.min(94, profile.pumpLoad + scenario.pump * 1.5 + scenario.stroke / 12 - 15); return { production, viscosity, load, efficiency: Math.max(62, 92 - load * .28), sor: Math.max(2.2, 4.1 - heatGain * .72 - steamGain * .3) } }, [scenario, profile])
  
  // Interpolated metrics for live simulation — now seeded from actual live sensor data
  const progress = day / 30;
  const liveTemp = day > 0 ? Math.round(live.temp + ((scenario.temperature - live.temp) * (day <= 16 ? day / 16 : 1 - ((day - 16)/14) * 0.3))) : live.temp;
  const liveVisc = day > 0 ? Math.round(live.viscosity - ((live.viscosity - forecast.viscosity) * progress)) : live.viscosity;
  const liveOil = day > 18 ? Number((live.oil + ((forecast.production - live.oil) * ((day - 18) / 12))).toFixed(1)) : live.oil;
  const liveLoad = day > 0 ? Math.round(live.pumpLoad + ((forecast.load - live.pumpLoad) * (day > 18 ? (day - 18) / 12 : 0))) : live.pumpLoad;

  useEffect(() => {
    let t: NodeJS.Timeout;
    if (running && day < 30) t = setInterval(() => setDay(d => d + 1), 600);
    else if (day >= 30) setRunning(false);
    return () => clearInterval(t);
  }, [running, day]);

  useEffect(() => {
    if (day <= 16) setPhase('Injection Phase');
    else if (day <= 18) setPhase('Soak Phase');
    else setPhase('Production Phase');
  }, [day]);

  const inputs: { key: keyof Scenario; label: string; min: number; max: number; unit: string }[] = [{ key: 'steam', label: 'Steam Volume', min: 50, max: 300, unit: 'tonnes' }, { key: 'pressure', label: 'Injection Pressure', min: 10, max: 40, unit: 'bar' }, { key: 'temperature', label: 'Steam Temperature', min: 200, max: 320, unit: '°C' }, { key: 'duration', label: 'Injection Duration', min: 7, max: 28, unit: 'days' }, { key: 'soak', label: 'Soak Time', min: 12, max: 96, unit: 'hours' }, { key: 'pump', label: 'Pump Speed (SPM)', min: 2, max: 12, unit: '' }, { key: 'stroke', label: 'Stroke Length', min: 40, max: 120, unit: 'inch' }]
  return <><div className="page-heading"><div><h1>Well {well}</h1><span className="status-pill"><i />{phase}</span><span className="location"><MapPin />Baghewala Field, Rajasthan</span></div><div className="heading-actions"><div className="updated">Simulation Day<br /><b style={{color: '#155fb9'}}>Day {day} of 30</b></div><div className="updated" style={{marginRight: '4px'}}>Live Sensor<br /><b key={tick} className="flash-value" style={{color:'#188554'}}>{live.oil.toFixed(1)} m³/d · {live.temp}°C</b></div><button className="outline-button" onClick={() => notify(`Well ${well} details opened`)}>View Well Details <ChevronRight /></button></div></div><div className="subnav"><button className="active">Simulation</button><button onClick={() => notify('Predicted performance view loaded')}>Predicted Performance</button><button onClick={() => notify('Sensitivity analysis queued')}>Parameter Sensitivity</button><button onClick={() => notify('History match loaded')}>History Match</button></div><div className="sim-grid"><section className="panel scenario-panel"><div className="panel-title"><h2>Current Well State</h2><span className="live"><i />Live Data</span></div><div className="state-grid">{[['Oil Rate', liveOil.toFixed(1), 'm³/day'], ['Reservoir Temp.', liveTemp, '°C'], ['Oil Viscosity', liveVisc, 'cP'], ['Wellhead Pressure', live.pressure.toFixed(1), 'bar'], ['Pump Load', liveLoad, '% of rated'], ['Water Cut', live.waterCut.toFixed(1), '%']].map(([label, value, unit]) => <div className="state-box" key={String(label)}><span>{label}</span><strong key={`${String(label)}-${tick}`} className="flash-value">{value}</strong><small>{unit}</small></div>)}</div><div className="scenario-title"><h2>Operating Scenario</h2><button onClick={reset}><RotateCcw /> Reset to Current</button></div><div className="phase-toggle">{(['Injection Phase', 'Soak Phase', 'Production Phase'] as Phase[]).map((item) => <button key={item} className={phase === item ? 'active' : ''} onClick={() => { setPhase(item); setDay(item === 'Injection Phase' ? 0 : item === 'Soak Phase' ? 16 : 18); notify(`${item} selected`) }}>{item}</button>)}</div><div className="controls">{inputs.map(({ key, label, min, max, unit }) => <label className="range-row" key={key}><div><span>{label}</span><div><input type="number" value={scenario[key]} min={min} max={max} onChange={(e) => update(key, Number(e.target.value))} /><em>{unit}</em></div></div><input type="range" min={min} max={max} value={scenario[key]} onChange={(e) => update(key, Number(e.target.value))} /><small><span>{min}</span><span>{max}</span></small></label>)}<details><summary><ChevronDown /> SRP Settings (Production Phase)</summary><p>Rod-string loading stays within the recommended operating envelope for this scenario.</p></details><details><summary><ChevronDown /> Advanced Parameters</summary><p>Thermal diffusivity 0.11 m²/day · Productivity index 1.8 m³/day/bar.</p></details></div><button className="run-button" onClick={() => { setRunning(true); setDay(0); notify(`Simulation started`) }}>{running ? <><span className="spinner"></span> Running Simulation...</> : <><Play fill="currentColor" /> Run 30-Day Simulation</>}</button></section><section className="center-column"><SimulationCanvas phase={phase} running={running} onToggle={() => setRunning(v => !v)} well={well} profile={profile} day={day} setDay={setDay} /><div className="trend-heading"><h2>Key Trends <span>(Predicted vs Current)</span></h2><select defaultValue="30 days"><option>30 days</option><option>60 days</option><option>90 days</option></select></div><div className="trend-grid"><MiniChart color="#f07f3c" label="Reservoir Temperature (°C)" points={[live.temp, live.temp + 12, live.temp + 35, live.temp + 60, live.temp + 80, live.temp + 95, Math.round(live.temp + 110)]} /><MiniChart color="#2f6ce5" label="Oil Viscosity (cP)" points={[live.viscosity, live.viscosity - 30, live.viscosity - 80, live.viscosity - 120, live.viscosity - 150, live.viscosity - 180, Math.round(forecast.viscosity)]} /><MiniChart color="#29965d" label="Oil Production Rate (m³/day)" points={[live.oil, live.oil + 0.5, live.oil + 1.2, live.oil + 2.5, live.oil + 3.8, live.oil + 4.5, Number(forecast.production.toFixed(1))]} /><MiniChart color="#8b43d7" label="Pump Load (% of rated)" points={[live.pumpLoad, live.pumpLoad + 3, live.pumpLoad + 6, live.pumpLoad + 9, live.pumpLoad + 7, live.pumpLoad + 5, Math.round(forecast.load)]} /><MiniChart color="#dc4743" label="Steam Oil Ratio (SOR)" points={[5.2, 4.8, 4.3, 3.9, 3.6, 3.2, Number(forecast.sor.toFixed(1))]} /></div></section><section className="panel outcome-panel"><div className="panel-title"><h2>Predicted Outcome <span>(Next 30 days)</span></h2><span className="confidence">Model Confidence: {profile.confidence}%</span></div><div className="metric-grid"><MetricCard icon={<Droplets />} label="Oil Production Rate" value={`+${Math.round((forecast.production / live.oil - 1) * 100)}%`} detail={`${forecast.production.toFixed(1)} m³/day`} current={`${live.oil.toFixed(1)} m³/day`} /><MetricCard icon={<Thermometer />} label="Oil Viscosity" value={`-${Math.round((1 - forecast.viscosity / live.viscosity) * 100)}%`} detail={`${Math.round(forecast.viscosity)} cP`} current={`${live.viscosity} cP`} /><MetricCard icon={<Waves />} label="Steam Oil Ratio" value={`-${Math.round((1 - forecast.sor / 4.1) * 100)}%`} detail={forecast.sor.toFixed(1)} current="4.1" /><MetricCard icon={<Zap />} label="Energy Use" value="-8%" detail="1,420 kWh/day" current="1,540 kWh/day" /><MetricCard icon={<Gauge />} label="Pump Efficiency" value={`+${Math.round(forecast.efficiency - 63)}%`} detail={`${Math.round(forecast.efficiency)}%`} current="63%" /><MetricCard icon={<AlertTriangle />} label="Equipment Risk" value={live.pumpLoad > 80 ? 'High' : forecast.load > 86 ? 'Medium' : 'Low'} detail="Rod loading monitored" current={profile.pumpLoad > 80 ? 'High' : 'Low'} /></div><div className="insights"><h3><Info /> Operational Insights</h3><ul><li>Live temp {live.temp}°C — viscosity at {live.viscosity} cP. Heating is improving inflow.</li><li>Projected pump load peaks at {Math.round(forecast.load)}%, inside the 90% operating limit.</li><li>Steam efficiency improves as the heated zone expands around the wellbore.</li><li>Forecast uses {well} live sensor baseline and 30-day thermal response curve.</li></ul></div><div className="outcome-actions"><button className="outline-button" onClick={() => notify('Scenario saved to demo workspace')}>Save Operating Scenario</button><button className="primary-button" onClick={() => notify('Scenario sent to operator review')}>Send for Operator Review</button></div></section></div></>
}

function DataPage({ active, notify, liveData, liveFieldOil, liveAvgTemp, tick }: { active: string; notify: (message: string) => void; liveData: LiveField; liveFieldOil: string; liveAvgTemp: number; tick: number }) {
  const isReports = active === 'Data & Reports'; const isInsights = active === 'Field Insights'; 
  const rows = wellNames.map((name, i) => {
    const p = wellProfiles[name]
    const lw = liveData[name] || p;
    return {
      name,
      phase: p.phase,
      oil: lw.oil.toFixed(1),
      temp: lw.temp,
      pumpLoad: lw.pumpLoad,
      waterCut: lw.waterCut,
      efficiency: Math.round(92 - lw.pumpLoad * 0.28),
      risk: lw.pumpLoad > 80 ? 'High' : lw.pumpLoad > 70 ? 'Medium' : 'Low',
      status: lw.pumpLoad > 80 ? 'Watchlist' : lw.pumpLoad > 70 ? 'Under Review' : 'Producing',
      uplift: (Math.sin(i * 1.4) * 5 + 12).toFixed(1),
      tempGain: (Math.cos(i) * 3 + 8).toFixed(1),
      sorChange: (Math.sin(i * 2) * 2 - 6).toFixed(1),
    }
  });

  const totalOil = rows.reduce((s, r) => s + parseFloat(r.oil), 0).toFixed(1);
  const highRisk = rows.filter(r => r.risk === 'High').length;

  // Dynamically generate recommendations from live sensor values
  const recommendations: [string, string, string, string, string, React.ReactNode][] = [];
  rows.forEach(r => {
    if (r.pumpLoad > 75) recommendations.push([r.name, 'Inspect rod string & reduce SPM', `Pump load critically high (${r.pumpLoad}%). Rod string fatigue risk is rising.`, 'Critical', 'amber', <AlertTriangle key={r.name+'a'} />]);
    else if (r.waterCut > 18) recommendations.push([r.name, 'Water shut-off analysis required', `Water cut at ${r.waterCut.toFixed(1)}%. Potential channeling in lower pay zone.`, 'Investigation', 'blue', <Waves key={r.name+'b'} />]);
    else if (r.phase === 'Soak Phase') recommendations.push([r.name, 'Prepare production equipment', `Soak phase ending. Temp at ${r.temp}°C — schedule pump startup within 24h.`, 'Optimization', 'green', <Thermometer key={r.name+'c'} />]);
    else if (r.phase === 'Injection Phase') recommendations.push([r.name, 'Monitor steam quality & flow rate', `Injection ongoing. Confirm steam dryness fraction ≥ 0.85 at wellhead.`, 'Monitoring', 'blue', <Droplets key={r.name+'d'} />]);
  });
  if (recommendations.length < 3) recommendations.push(['Field Wide', 'Optimize Steam Allocation', 'Re-allocate steam from wells with high SOR to BW-05, BW-10 for better thermal efficiency.', 'Strategic', 'blue', <Droplets key="fw" />]);

  if (active === 'Recommendations') return <div className="dashboard-page">
    <div className="page-heading simple"><div><h1>Dynamic Recommendations</h1><p>AI-generated, real-time actions derived from live sensor data across all {wellNames.length} wells. Data updates every 3 seconds.</p></div><button className="primary-button" onClick={() => notify('Recommendation review started')}>Review Queue <ChevronRight /></button></div>
    <div className="recommendation-grid">
      {recommendations.slice(0, 6).map(([well, title, copy, tag, tone, icon], idx) => (
        <article className="recommendation-card" key={idx}>
          <div className={`recommendation-icon ${tone}`}>{icon}</div>
          <div style={{flex:1, minWidth:0}}>
            <span className="eyebrow">{well} &nbsp;·&nbsp; {tag}</span>
            <h2 style={{margin:'0 0 6px',fontSize:'14px',fontWeight:700,color:'#1b304d',lineHeight:1.3}}>{title}</h2>
            <p style={{margin:'0 0 12px',color:'#657388',fontSize:'12px',lineHeight:1.6}}>{copy}</p>
            <button className="outline-button" style={{width:'100%',justifyContent:'center',fontSize:'11px'}} onClick={() => notify(`${title} added to plan`)}>Execute Plan <ChevronRight /></button>
          </div>
        </article>
      ))}
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',marginTop:'14px'}}>
      <div className="activity-panel">
        <h2><Activity size={16} />Recent Decisions</h2>
        <p><b>Just now</b> Auto-tuning Injection Pressure for BW-03 — pressure set to 19 bar</p>
        <p><b>09:42</b> BW-07 simulation saved by Operations Team · Cycle 15 scenario queued</p>
        <p><b>08:15</b> BW-09 alert assigned to Field Maintenance · Rod-load variance flagged</p>
        <p><b>Yesterday</b> BW-02 pressure recommendation acknowledged by Supervisor A. Mehta</p>
      </div>
      <div className="activity-panel">
        <h2><LightbulbIcon /> Impact Analysis</h2>
        <p><b>AI confidence</b> <span style={{float:'right',fontWeight:700,color:'#1265d9'}}>87%</span><br/>Based on 14 comparable historical cycles</p>
        <p><b>Expected field uplift</b> <span style={{float:'right',fontWeight:700,color:'#188554'}}>+{(parseFloat(totalOil) * 0.12).toFixed(1)} m³/day</span><br/>If all high-priority actions executed</p>
        <p><b>Operator queue</b> <span style={{float:'right',fontWeight:700,color:'#b86e0a'}}>{highRisk + 2} actions</span><br/>{highRisk} maintenance · 2 optimization pending</p>
      </div>
    </div>
  </div>
  if (active === 'Well Overview') return <div className="dashboard-page"><div className="page-heading simple"><div><h1>Field Summary</h1><p>Production health, steam utilization, and exception status for the Baghewala thermal program.</p></div><button className="primary-button" onClick={() => notify('Field summary refreshed')}>Refresh Summary <BarChart3 /></button></div><div className="kpi-row"><div><span>Field oil rate</span><b key={tick} className="flash-value">{totalOil} <small>m³/day</small></b><small className="good">↑ Live updating</small></div><div><span>Steam injected</span><b>1,850 <small>tonnes</small></b><small>82% of daily plan</small></div><div><span>Producing wells</span><b>{rows.filter(r=>r.status==='Producing').length} / 10</b><small>{rows.filter(r=>r.status!=='Producing').length} wells in heating/soak</small></div><div><span>Field uptime</span><b>95.4%</b><small className="good">↑ 0.8 pts this week</small></div></div><div className="overview-grid"><div className="table-panel"><div className="table-heading"><h2>Well operating status</h2><span>Live feed · updates every 1.5s</span></div><table><thead><tr><th>Well</th><th>Phase</th><th>Oil rate</th><th>Temp.</th><th>Pump load</th><th>Water cut</th><th>Status</th></tr></thead><tbody>{rows.map((row) => <tr key={row.name}><td><b>{row.name}</b></td><td>{row.phase.split(' ')[0]}</td><td key={`${row.name}-oil-${tick}`} className="flash-value">{row.oil} m³/d</td><td key={`${row.name}-temp-${tick}`} className="flash-value">{row.temp} °C</td><td key={`${row.name}-load-${tick}`} className="flash-value" style={{color: row.pumpLoad > 80 ? '#be3c38' : row.pumpLoad > 70 ? '#b57a12' : '#188554', fontWeight:700}}>{row.pumpLoad}%</td><td key={`${row.name}-wc-${tick}`} className="flash-value">{row.waterCut.toFixed(1)}%</td><td><span className={`status-text ${row.risk.toLowerCase()}`}>{row.status}</span></td></tr>)}</tbody></table></div><div className="side-data-card"><h2>Field exceptions</h2>{recommendations.slice(0,3).map((r, i) => <p key={i}><b>{r[0]}</b> {r[1]}</p>)}<h2>Cycle schedule</h2><p>Next injection window <b>14 hours</b></p><p>Supervisor review <b>Pending</b></p></div></div></div>
  if (active === 'Field Insights') return <div className="dashboard-page"><div className="page-heading simple"><div><h1>Performance Analytics</h1><p>Trend intelligence for production, thermal response, and artificial lift efficiency.</p></div><button className="primary-button" onClick={() => notify('Analytics recalculated from latest readings')}>Recalculate <BarChart3 /></button></div><div className="kpi-row"><div><span>30-day incremental oil</span><b>+182.4 <small>m³</small></b><small className="good">From optimized cycles</small></div><div><span>Best response well</span><b>BW-10</b><small>+26.5% oil rate uplift</small></div><div><span>Thermal recovery</span><b>84.8%</b><small className="good">Above 82% target</small></div><div><span>Avg. reservoir temp.</span><b key={tick} className="flash-value">{liveAvgTemp} <small>°C</small></b><small>Live · all 10 wells</small></div></div><div className="analytics-grid"><div className="trend-stack"><MiniChart label="Field oil rate (m³/day)" color="#188554" points={[148, 149.2, 151, 148.5, 152, 154, 153.5, 156.2, 158, 157, 160.5, 163, 162.8, 164, parseFloat(liveFieldOil)]} suffix=" m³/d" /><MiniChart label="Average reservoir temperature (°C)" color="#e28a2b" points={[135, 136, 136.5, 137, 137.2, 138, 139.5, 140, 140.5, 141.2, 142, 143, 143.5, 144, liveAvgTemp]} suffix=" °C" /><MiniChart label="Steam-oil ratio" color="#d74d4d" points={[5.2, 5.1, 4.9, 4.95, 4.8, 4.6, 4.5, 4.4, 4.2, 4.1, 4.0, 3.85, 3.8, 3.7, 3.6]} suffix=" SOR" /><MiniChart label="Artificial lift efficiency" color="#7257d9" points={[65, 66, 65.5, 67, 68, 68.5, 69, 70, 69.5, 71, 72, 72.5, 73, 74, 74]} suffix="%" /></div><div className="insight-card"><h2>What changed this cycle</h2><div><b>+18%</b><span>BW-07 production forecast after steam optimization</span></div><div><b>-8%</b><span>Field SOR improvement after soak-time tuning</span></div><div><b>{rows.filter(r=>r.temp>=145).length} wells</b><span>showing above-target thermal response ({'>'} 145°C)</span></div><h2>Recommended focus</h2><p>Keep BW-10 and BW-07 on the optimized cycle template. Review BW-09 rod-load variance before increasing pump speed. Current field oil rate: <span key={tick} className="flash-value">{liveFieldOil} m³/day</span>.</p></div></div><div className="table-panel"><div className="table-heading"><h2>Performance by well</h2><span>Compared with previous cycle</span></div><table><thead><tr><th>Well</th><th>Oil uplift</th><th>Temp. gain</th><th>SOR change</th><th>Lift efficiency</th><th>Signal</th></tr></thead><tbody>{rows.map((row, i) => <tr key={row.name}><td><b>{row.name}</b></td><td key={`${row.name}-up-${tick}`} className="good flash-value">+{row.uplift}%</td><td key={`${row.name}-tg-${tick}`} className="flash-value">+{row.tempGain} °C</td><td key={`${row.name}-sor-${tick}`} className="good flash-value">{row.sorChange}%</td><td key={`${row.name}-eff-${tick}`} className="flash-value">{row.efficiency}%</td><td><span className={`status-text ${row.risk.toLowerCase()}`}>{row.risk === 'Low' ? 'On track' : row.risk === 'Medium' ? 'Review' : 'Intervene'}</span></td></tr>)}</tbody></table></div></div>

  return <div className="dashboard-page"><div className="page-heading simple"><div><h1>{active}</h1><p>{isReports ? 'Operational exports, cycle history, and audit-ready field data.' : isInsights ? 'Patterns and performance signals across the active thermal program.' : 'Live operational intelligence across Baghewala Field.'}</p></div><button className="primary-button" onClick={() => notify(isReports ? 'CSV export prepared for download' : 'Field summary refreshed')}>{isReports ? 'Export CSV' : 'Refresh Data'} <BarChart3 /></button></div><div className="kpi-row"><div><span>Active Wells</span><b>10</b><small>7 producing · 3 heating/soak</small></div><div><span>Field Oil Rate</span><b>164.2 <small>m³/day</small></b><small className="good">↑ 4.1% vs last cycle</small></div><div><span>Avg. SOR</span><b>3.6</b><small className="good">↓ 8% optimized</small></div><div><span>Data Quality</span><b>99.1%</b><small>Last sync 10:24 IST</small></div></div><div className="field-strip"><div><span>Steam injected today</span><b>1,850 t</b><small>+2.5% vs planned</small></div><div><span>Average reservoir temp.</span><b>144.2 °C</b><small>Across 10 monitored wells</small></div><div><span>Maintenance exposure</span><b>{recommendations.length} items</b><small>Requires attention</small></div><div><span>Next cycle window</span><b>14 hrs</b><small>Supervisor approval pending</small></div></div>{isReports ? <div className="report-cards" style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px'}}>
    {[
      { title: 'Daily Production Report', meta: '26 May 2025 · 10 wells · 164.2 m³/day', desc: 'Comprehensive breakdown of fluid rates, water cut, and uptime metrics across the entire Baghewala field.', icon: <Droplets /> },
      { title: 'Steam Cycle Economics', meta: 'Cycle 14 · 1,850 tonnes injected · 3.6 SOR', desc: 'Financial analysis of energy input vs hydrocarbon output, highlighting optimization opportunities.', icon: <Zap /> },
      { title: 'Equipment Audit Log', meta: '21 checks completed · 3 outstanding', desc: 'Maintenance records for Artificial Lift systems, wellhead integrity, and surface piping.', icon: <Gauge /> },
      { title: 'Reservoir Heat Map', meta: '3D Thermal Extents · Updated 08:00', desc: 'Subsurface temperature distribution derived from observation wells and production fluid temperatures.', icon: <Thermometer /> },
      { title: 'Regulatory Compliance', meta: 'Emissions & Water Management', desc: 'Formatted data package ready for submission to state environmental regulators.', icon: <Info /> },
      { title: 'Custom Data Export', meta: 'Select date range and variables', desc: 'Build a custom CSV/Excel export of raw sensor data and calculated metrics.', icon: <Settings /> }
    ].map((r, i) => (
      <div key={i} className="report-card">
        <div className="report-icon">{r.icon}</div>
        <h2 style={{margin: '4px 0 0', fontSize: '16px', color: '#1b304d'}}>{r.title}</h2>
        <span style={{fontSize: '11px', color: '#68758a', fontWeight: '700', textTransform: 'uppercase'}}>{r.meta}</span>
        <p style={{margin: '0 0 16px', fontSize: '13px', color: '#5b6e85', lineHeight: '1.5', flex: 1}}>{r.desc}</p>
        <button className="outline-button" style={{width: '100%', justifyContent: 'center'}} onClick={() => notify(`${r.title} prepared`)}>Open Report</button>
      </div>
    ))}
  </div> : <div className="table-panel"><div className="table-head"><h2>{isInsights ? 'Field performance signals' : 'Well Performance Monitor'}</h2><div className="search-box"><Search /><input placeholder="Search wells..." /></div></div><div className="table-wrap"><table><thead><tr><th>Well</th><th>Status</th><th>Oil Rate</th><th>Reservoir Temp.</th><th>Pump Efficiency</th><th>Equipment Risk</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={row.name}><td><b>{row.name}</b><small>Jodhpur Sandstone · Cycle 14</small></td><td><span className={`table-status ${row.status === 'Producing' ? 'green' : 'amber'}`}><i />{row.status}</span></td><td key={`${row.name}-oil-${tick}`} className="flash-value">{row.oil} m³/day</td><td key={`${row.name}-temp-${tick}`} className="flash-value">{row.temp}°C</td><td key={`${row.name}-eff-${tick}`} className="flash-value">{row.efficiency}%</td><td><span className={`risk ${row.risk.toLowerCase()}`}>{row.risk}</span></td><td><button className="icon-button" aria-label={`Open ${row.name}`} onClick={() => notify(`Opening ${row.name} record`)}><ChevronRight /></button></td></tr>)}</tbody></table></div></div>}</div>
}
function LightbulbIcon() { return <Sparkles /> }

export default function Page() {
  const [active, setActive] = useState('Simulator');
  const [selectedWell, setSelectedWell] = useState('BW-01');
  const [toast, setToast] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [liveData, tick] = useLiveField();
  const clock = useClock();
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600) }

  // Live field-wide aggregates
  const liveFieldOil = (Object.values(liveData).reduce((s, w) => s + w.oil, 0)).toFixed(1);
  const liveAvgTemp = Math.round(Object.values(liveData).reduce((s, w) => s + w.temp, 0) / 10);
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });

  return <main className="app-shell"><header className="topbar"><div className="brand"><div className="brand-mark"><Activity /></div><div><b>Baghewala Field</b><span>Steam &amp; Pump Operations Simulator</span></div></div><button className="mobile-menu" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X /> : <Menu />}</button><nav className={mobileOpen ? 'open' : ''}>{navItems.map((item) => <button key={item} className={active === item ? 'active' : ''} onClick={() => { setActive(item); setMobileOpen(false) }}>{item}</button>)}</nav><div className="top-actions"><span style={{display:'flex',alignItems:'center',gap:'6px'}}><CalendarDays />{dateStr}&nbsp;&nbsp;<b style={{color:'#a0d8ff'}}>{clock}</b></span><span style={{background:'#1a3a1a',color:'#4cde8a',fontSize:'10px',fontWeight:700,padding:'3px 8px',borderRadius:'4px',letterSpacing:'.5px',display:'flex',alignItems:'center',gap:'5px'}}><span style={{width:'7px',height:'7px',borderRadius:'50%',background:'#4cde8a',display:'inline-block',animation:'pulse-dot 1s ease-in-out infinite'}} />LIVE</span><i /><span className="avatar">OP</span><span>Operations Team <ChevronDown /></span></div></header><div className="body-layout"><aside className={mobileOpen ? 'side open' : 'side'}><div className="side-heading">WELLS</div><div className="search-box dark"><Search /><input placeholder="Search wells..." /></div><div className="well-list">{wellNames.map((name) => <button key={name} className={`${selectedWell === name ? 'selected' : ''} ${name === 'BW-01' ? 'highlighted-well' : ''}`} onClick={() => { setSelectedWell(name); setActive('Simulator'); setMobileOpen(false) }}>{name}<small style={{display:'block',fontSize:'9px',opacity:.6,fontWeight:400}}>{liveData[name]?.oil.toFixed(1)} m³/d</small></button>)}</div><div className="side-links"><button className={active === 'Well Overview' ? 'active' : ''} onClick={() => setActive('Well Overview')}><SlidersHorizontal />Field Summary</button><button className={active === 'Recommendations' ? 'active' : ''} onClick={() => setActive('Recommendations')}><Bell />Recommendations</button><button className={active === 'Field Insights' ? 'active' : ''} onClick={() => setActive('Field Insights')}><BarChart3 />Performance Analytics</button><button className={active === 'Data & Reports' ? 'active' : ''} onClick={() => setActive('Data & Reports')}><Droplets />Reports</button></div><div className="side-bottom"><button onClick={() => notify('Settings panel ready')}><Settings />Settings</button><button onClick={() => notify('Help center opened')}><CircleHelp />Help</button></div></aside><section className="content">{active === 'Simulator' ? <Simulator well={selectedWell} notify={notify} liveData={liveData} tick={tick} /> : <DataPage active={active} notify={notify} liveData={liveData} liveFieldOil={liveFieldOil} liveAvgTemp={liveAvgTemp} tick={tick} />}</section></div>{toast && <div className="toast"><Sparkles />{toast}</div>}</main>
}
