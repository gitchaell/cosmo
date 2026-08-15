import React, { useEffect, useState, useRef } from 'react';
import useCosmosStore from '../store/useCosmosStore';
import { Observer, Equator } from 'astronomy-engine';
import Starfield from './Starfield';
import { Play, Pause, FastForward, Rewind, MapPin, Search, ChevronDown, Compass, Target, Info, Activity, Maximize2, Settings } from 'lucide-react';

const Header = () => {
  const { location, setLocation, time } = useCosmosStore();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            name: 'Current Location'
          });
        },
        (error) => {
          console.warn("Geolocation denied or error:", error);
        }
      );
    }
  }, [setLocation]);

  const formatLatLon = (lat, lon) => {
    const latStr = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
    const lonStr = `${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;
    return `${latStr}, ${lonStr}`;
  };

  return (
    <header className="flex flex-col md:flex-row items-start md:h-20 justify-between px-4 md:px-margin pt-4 md:pt-margin pointer-events-none z-40 absolute top-0 left-0 right-0 w-full gap-4 md:gap-0">
      <div className="flex flex-col border-l border-primary/60 pl-3 pointer-events-auto bg-surface-container-lowest/20 backdrop-blur-sm p-2 text-xs md:text-sm">
        <div className="font-label-caps text-label-caps text-primary tracking-widest uppercase">Observation Point</div>
        <div className="font-data-mono text-data-mono text-on-surface flex flex-wrap gap-2 md:gap-4 mt-1">
          <span>{formatLatLon(location.lat, location.lon)}</span>
          <span className="text-primary/40 hidden sm:inline">|</span>
          <span className="hidden sm:inline">{location.name}</span>
          <span className="text-primary/40 hidden md:inline">|</span>
          <span className="text-primary glow-text">
            {time.toLocaleTimeString()} LOCAL
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end border-r border-primary/60 pr-3 pointer-events-auto bg-surface-container-lowest/20 backdrop-blur-sm p-2 hidden sm:flex">
        <div className="font-label-caps text-label-caps text-primary tracking-widest uppercase">Telemetry Output</div>
        <div className="font-data-mono text-data-mono text-on-surface flex gap-4 mt-1">
          <span>FPS: 60.0</span>
          <span>LATENCY: 12ms</span>
          <span className="text-primary">SIM: {useCosmosStore((state) => state.speed)}x</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center mt-3">
          <Activity className="text-on-primary w-4 h-4" />
        </div>
      </div>
    </header>
  );
};


const Sidebar = () => {
  const { focusedStar, time, location } = useCosmosStore();
  const [isOpen, setIsOpen] = useState(false);
  const [azAlt, setAzAlt] = useState({ az: 0, alt: 0 });

  // Auto-open sidebar when a star is selected
  useEffect(() => {
    if (focusedStar) {
      setIsOpen(true);
    }
  }, [focusedStar]);

  useEffect(() => {
    if (focusedStar) {
      // Calculate Alt/Az using astronomy-engine
      // This is a simplified calculation, normally you'd use Equator and Observer
      const observer = new Observer(location.lat, location.lon, 0);
      // const eq = Equator(focusedStar.name, time, observer, true, true); // not used

      // Need a proper Star/Body for Astronomy Engine or just compute manually if Astronomy doesn't have it.
      // Astronomy Engine has predefined bodies, for arbitrary RA/DEC we can use Horizon function if available,
      // or convert manually.
      // For simplicity in this demo without diving deep into Astronomy Engine's internal RA/DEC to AltAz conversion:
      // We will approximate or use a generic math conversion.

      // Basic manual RA/DEC to Alt/Az conversion
      const rad = Math.PI / 180;
      const decRad = focusedStar.dec * rad;
      const latRad = location.lat * rad;

      // Local Sidereal Time (LST) approx
      const d = time.getTime() / 86400000 - 10957.5; // Days since J2000
      const lst = (280.46061837 + 360.98564736629 * d + location.lon) % 360;
      const lstRad = lst * rad;
      const raRad = focusedStar.ra * rad;

      const haRad = lstRad - raRad;

      const sinAlt = Math.sin(decRad)*Math.sin(latRad) + Math.cos(decRad)*Math.cos(latRad)*Math.cos(haRad);
      const altRad = Math.asin(sinAlt);
      const alt = altRad / rad;

      const cosAz = (Math.sin(decRad) - Math.sin(latRad)*sinAlt) / (Math.cos(latRad)*Math.cos(altRad));
      let az = Math.acos(cosAz) / rad;
      if (Math.sin(haRad) > 0) az = 360 - az;

      setAzAlt({ az: isNaN(az) ? 0 : az, alt: isNaN(alt) ? 0 : alt });
    }
  }, [focusedStar, time, location]);

  const getAzimuthDirection = (az) => {
    if (az < 22.5 || az >= 337.5) return 'N';
    if (az < 67.5) return 'NE';
    if (az < 112.5) return 'E';
    if (az < 157.5) return 'SE';
    if (az < 202.5) return 'S';
    if (az < 247.5) return 'SW';
    if (az < 292.5) return 'W';
    if (az < 337.5) return 'NW';
    return '';
  };

  return (
    <div className={`absolute right-4 md:right-margin top-24 bottom-40 md:bottom-32 w-72 md:w-80 flex flex-col justify-start z-30 pointer-events-none group transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen ? '' : 'translate-x-[300px]'}`} id="intel-panel">
      <div
        className="absolute -left-8 top-8 bg-surface-container-low/90 backdrop-blur-md border border-primary/30 border-r-0 py-4 px-1 rounded-l-md pointer-events-auto cursor-pointer hover:bg-primary/10 transition-colors flex items-center justify-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Maximize2 className={`text-primary w-4 h-4 transform ${isOpen ? 'rotate-90' : '-rotate-90'}`} />
      </div>
      <div className="w-full bg-surface-container-low/90 backdrop-blur-xl border border-primary/20 rounded-lg rounded-tl-none p-panel-padding pointer-events-auto flex flex-col gap-6 h-full overflow-y-auto glow-border">
        {!focusedStar ? (
          <div className="flex-1 flex items-center justify-center text-on-surface-variant font-data-mono text-center p-4">
            No target locked. Select a star from the celestial sphere to view telemetry.
          </div>
        ) : (
          <>
            <div className="flex flex-col border-b border-primary/30 pb-3">
              <div className="flex justify-between items-start mb-1">
                <span className="font-label-caps text-label-caps text-primary tracking-widest uppercase">Target Intel</span>
                <span className="font-data-mono text-[10px] text-primary/60 border border-primary/30 px-1">LOCKED</span>
              </div>
              <h2 className="font-display-lg text-display-lg text-on-surface mb-0">{focusedStar.name}</h2>
              <span className="font-data-mono text-data-mono text-on-surface-variant">{focusedStar.constellation}</span>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between font-label-caps text-[10px] text-on-surface-variant">
                <span>SPECTRAL CLASS</span>
                <span className="text-primary glow-text">{focusedStar.spectral_class}</span>
              </div>
              <div className="h-2 w-full bg-surface relative rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-error via-tertiary-container to-primary opacity-30"></div>
                {/* Simplified position indicator based on class string first letter */}
                <div className="absolute top-0 h-full w-0.5 bg-primary shadow-[0_0_8px_rgba(47,217,244,1)]"
                     style={{ left: `${'OBAFGKM'.indexOf(focusedStar.spectral_class[0]) / 6 * 100}%` }}></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px bg-primary/20 border border-primary/20">
              <div className="bg-surface-container-low p-2 flex flex-col gap-1">
                <span className="font-label-caps text-[9px] text-primary/60">RA (J2000)</span>
                <span className="font-data-mono text-[13px] text-on-surface">{focusedStar.ra.toFixed(3)}°</span>
              </div>
              <div className="bg-surface-container-low p-2 flex flex-col gap-1">
                <span className="font-label-caps text-[9px] text-primary/60">DEC (J2000)</span>
                <span className="font-data-mono text-[13px] text-on-surface">{focusedStar.dec.toFixed(3)}°</span>
              </div>
              <div className="bg-surface-container-low p-2 flex flex-col gap-1">
                <span className="font-label-caps text-[9px] text-primary/60">AZIMUTH</span>
                <span className="font-data-mono text-[13px] text-on-surface">{azAlt.az.toFixed(1)}° {getAzimuthDirection(azAlt.az)}</span>
              </div>
              <div className="bg-surface-container-low p-2 flex flex-col gap-1">
                <span className="font-label-caps text-[9px] text-primary/60">ALTITUDE</span>
                <span className="font-data-mono text-[13px] text-on-surface">{azAlt.alt > 0 ? '+' : ''}{azAlt.alt.toFixed(1)}°</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 font-data-mono text-data-mono">
              <div className="flex justify-between items-center border-b border-outline-variant/20 pb-1">
                <span className="text-on-surface-variant">APPARENT MAG</span>
                <span className="text-primary">{focusedStar.apparent_mag}</span>
              </div>
              <div className="flex justify-between items-center border-b border-outline-variant/20 pb-1">
                <span className="text-on-surface-variant">ABSOLUTE MAG</span>
                <span className="text-primary">{focusedStar.absolute_mag}</span>
              </div>
              <div className="flex justify-between items-center border-b border-outline-variant/20 pb-1">
                <span className="text-on-surface-variant">DISTANCE</span>
                <span className="text-primary">{focusedStar.distance_ly} ly</span>
              </div>
              <div className="flex justify-between items-center border-b border-outline-variant/20 pb-1">
                <span className="text-on-surface-variant">TEMPERATURE</span>
                <span className="text-primary">{focusedStar.temp_k} K</span>
              </div>
            </div>

            <div className="mt-auto">
              <button className="w-full py-3 border border-primary/40 bg-primary/5 hover:bg-primary/15 text-primary font-label-caps tracking-widest uppercase transition-all hover:border-primary hover:shadow-[0_0_12px_rgba(47,217,244,0.2)] flex items-center justify-center gap-2">
                <Search size={18} />
                Initiate Deep Scan
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const LeftMonitor = () => {
  const bars = Array.from({ length: 12 }, (_, i) => i);
  const [heights, setHeights] = useState(bars.map(() => Math.floor(Math.random() * 90) + 10));

  useEffect(() => {
    const interval = setInterval(() => {
      setHeights(prev => prev.map(h => Math.random() > 0.3 ? Math.floor(Math.random() * 90) + 10 : h));
    }, 150);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute left-4 md:left-margin bottom-40 md:bottom-32 flex flex-col gap-4 z-30 pointer-events-none hidden sm:flex">
      <div className="w-48 md:w-64 bg-surface-container-low/80 backdrop-blur-md border border-error/30 p-3 flex flex-col gap-2 rounded-lg pointer-events-auto">
        <div className="flex justify-between items-center border-b border-error/20 pb-1">
          <span className="font-label-caps text-[10px] text-error tracking-widest">UAP TRACKER</span>
          <span className="w-2 h-2 rounded-full bg-error animate-pulse shadow-[0_0_5px_rgba(255,180,171,0.8)]"></span>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex justify-between font-data-mono text-[10px]">
            <span className="text-on-surface-variant text-[12px]">SIGNATURE M1</span>
            <span className="text-error glow-text">DETECTED</span>
          </div>
          <div className="h-8 w-full relative flex items-end gap-[1px]">
            <div className="w-full h-full flex items-end justify-between gap-1 opacity-80" id="uap-signal-vis">
              {heights.map((h, i) => (
                <div key={i} className={`w-1 bg-error/40 transition-all duration-100 ${i === 2 ? 'bg-error/60 glow-border' : ''} ${i === 6 ? 'bg-error/80 shadow-[0_0_8px_rgba(255,180,171,0.8)]' : ''}`} style={{ height: `${h}%` }}></div>
              ))}
            </div>
            <div className="absolute top-1/2 w-full h-px bg-error/20"></div>
          </div>
          <div className="flex justify-between text-[10px] text-error/60 mt-1">
            <span>FREQ: 1420MHz</span>
            <span>INTENSITY: HIGH</span>
          </div>
        </div>
      </div>

      <div className="w-48 h-48 md:w-64 md:h-64 bg-surface-container-low/80 backdrop-blur-md rounded-full border border-primary/20 pointer-events-auto flex items-center justify-center relative glow-border p-4 group overflow-hidden">
        <div className="absolute top-2 left-2 font-label-caps text-[10px] text-primary/60 tracking-widest bg-surface/80 px-1 z-10">HORIZON</div>
        <div className="absolute inset-8 rounded-full border border-primary/10"></div>
        <div className="absolute inset-16 rounded-full border border-primary/10"></div>
        <div className="absolute inset-24 rounded-full border border-primary/20 border-dashed"></div>

        <div className="absolute inset-4 flex items-center justify-center"><div className="w-full h-px bg-primary/10"></div></div>
        <div className="absolute inset-4 flex items-center justify-center"><div className="h-full w-px bg-primary/10"></div></div>

        <div className="absolute inset-4 rounded-full overflow-hidden mix-blend-screen pointer-events-none">
          <div className="w-1/2 h-1/2 bg-gradient-to-br from-primary/30 to-transparent origin-bottom-right animate-[spin_4s_linear_infinite]"></div>
        </div>

        <div className="absolute top-[30%] left-[60%] w-2 h-2 bg-primary animate-pulse shadow-[0_0_8px_rgba(47,217,244,0.8)] rounded-full"></div>
        <div className="absolute top-[70%] left-[20%] w-1.5 h-1.5 bg-primary/60 rounded-full"></div>
        <div className="absolute top-[40%] left-[30%] w-1.5 h-1.5 bg-secondary animate-pulse shadow-[0_0_8px_rgba(255,183,131,0.5)] rounded-full"></div>

        <span className="absolute top-1 left-1/2 -translate-x-1/2 font-data-mono text-[10px] text-primary/80">N</span>
        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 font-data-mono text-[10px] text-primary/80">S</span>
        <span className="absolute left-1 top-1/2 -translate-y-1/2 font-data-mono text-[10px] text-primary/80">W</span>
        <span className="absolute right-1 top-1/2 -translate-y-1/2 font-data-mono text-[10px] text-primary/80">E</span>
      </div>
    </div>
  );
};

export default function Cosmos() {
  const { isPlaying, speed, setTime } = useCosmosStore();

  // Simulation loop decoupled from heavy React re-renders but updates the store time
  useEffect(() => {
    let lastUpdate = performance.now();
    let reqId;

    const loop = (now) => {
      if (isPlaying) {
        const dt = now - lastUpdate;
        const addTimeMs = dt * speed;
        setTime(new Date(useCosmosStore.getState().time.getTime() + addTimeMs));
      }
      lastUpdate = now;
      reqId = requestAnimationFrame(loop);
    };

    reqId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(reqId);
  }, [isPlaying, speed, setTime]);

  return (
    <div className="bg-background font-body-base text-on-surface overflow-hidden w-full h-screen relative flex">
      <div className="flex flex-col w-full h-full relative">
        <Header />
        <main className="flex-1 relative w-full h-full bg-[#051424]">
          {/* Ensure Starfield canvas takes full area under UI */}
          <div className="absolute inset-0 z-0">
            <Starfield />
          </div>
          <LeftMonitor />
          <Sidebar />
        </main>
      </div>
    </div>
  );
}
