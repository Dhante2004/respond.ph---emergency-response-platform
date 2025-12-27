
import React, { useState, useRef, useEffect } from 'react';
import { User, IncidentType, Report, AccountVerificationStatus } from '../types';
import { Camera, MapPin, Send, AlertTriangle, History, User as UserIcon, ShieldCheck, X, Upload, Info, RefreshCw, FlipHorizontal } from 'lucide-react';

interface CitizenPortalProps {
  user: User;
  reports: Report[];
  onSubmit: (reportData: Partial<Report>) => void;
  onUpdateUser: (userData: Partial<User>) => void;
}

const CitizenPortal: React.FC<CitizenPortalProps> = ({ user, reports, onSubmit, onUpdateUser }) => {
  const [view, setView] = useState<'form' | 'history' | 'account'>('form');
  const [incidentType, setIncidentType] = useState<IncidentType>('other');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [address, setAddress] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Camera State
  const [showCamera, setShowCamera] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const idInputRef = useRef<HTMLInputElement>(null);

  const myReports = reports.filter(r => r.userId === user.id);

  // Robust effect to attach stream and start playback
  useEffect(() => {
    let active = true;
    if (showCamera && stream && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = stream;
      
      // Explicitly call play() which is sometimes required even with autoPlay attribute
      video.play().catch(err => {
        console.warn("Video play failed:", err);
      });
    }
    return () => { active = false; };
  }, [showCamera, stream]);

  // Clean up stream on unmount or when stream changes
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const handleCaptureLocation = () => {
    setIsCapturingLocation(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setAddress('GPS Captured: Bongao, Tawi-Tawi');
        setIsCapturingLocation(false);
      }, () => {
        setLocation({ lat: 5.068, lng: 119.775 });
        setAddress('Location services denied. Using default.');
        setIsCapturingLocation(false);
      }, { enableHighAccuracy: true });
    }
  };

  // Camera Logic
  const startCamera = async () => {
    try {
      // Clear existing stream if any
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: false 
      });
      setStream(mediaStream);
      setShowCamera(true);
    } catch (err) {
      console.error("Camera access error:", err);
      alert("Please allow camera access in your browser settings to capture evidence.");
    }
  };

  const toggleCamera = () => {
    setCameraFacing(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Restart camera when facing changes while active
  useEffect(() => {
    if (showCamera) {
      startCamera();
    }
  }, [cameraFacing]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas to actual video stream dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Mirror the image if using front camera to match preview
        if (cameraFacing === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setImagePreview(dataUrl);
        stopCamera();
      }
    }
  };

  const handleIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateUser({ 
          accountVerificationStatus: 'pending',
          idImageUrl: reader.result as string 
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !location) return;

    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 1500));
    
    onSubmit({
      incidentType,
      description,
      latitude: location.lat,
      longitude: location.lng,
      addressLandmark: address || 'Current Location',
      imageUrl: imagePreview || `https://picsum.photos/seed/${Date.now()}/600/400`,
    });

    setIsSubmitting(false);
    setDescription('');
    setAddress('');
    setLocation(null);
    setImagePreview(null);
    setView('history');
  };

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <div className="flex bg-white rounded-xl shadow-sm border mb-6 overflow-hidden">
        <button 
          onClick={() => setView('form')}
          className={`flex-1 flex items-center justify-center gap-2 py-4 font-bold transition-colors ${view === 'form' ? 'bg-rose-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <AlertTriangle className="w-5 h-5" />
          Report
        </button>
        <button 
          onClick={() => setView('history')}
          className={`flex-1 flex items-center justify-center gap-2 py-4 font-bold transition-colors ${view === 'history' ? 'bg-rose-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <History className="w-5 h-5" />
          History
        </button>
        <button 
          onClick={() => setView('account')}
          className={`flex-1 flex items-center justify-center gap-2 py-4 font-bold transition-colors ${view === 'account' ? 'bg-rose-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <UserIcon className="w-5 h-5" />
          Account
        </button>
      </div>

      {view === 'form' ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {user.accountVerificationStatus !== 'verified' && (
            <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-2xl flex gap-4">
              <div className="bg-amber-100 text-amber-700 p-2 rounded-xl h-fit">
                <Info className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-amber-800 text-sm">Account Unverified</h4>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  Your report will be flagged as <strong>Unverified</strong> in the Command Center. For faster response times, please verify your identity in the Account tab.
                </p>
                <button 
                  type="button"
                  onClick={() => setView('account')}
                  className="mt-2 text-xs font-black text-amber-900 uppercase underline"
                >
                  Verify Now
                </button>
              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center justify-between">
              Incident Details
              {user.accountVerificationStatus === 'verified' && (
                <span className="flex items-center gap-1 text-xs bg-rose-100 text-rose-700 px-2 py-1 rounded-full">
                  <ShieldCheck className="w-3 h-3" />
                  Verified Reporter
                </span>
              )}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-2">Emergency Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['fire', 'crime', 'medical', 'accident', 'flood', 'other'] as IncidentType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setIncidentType(t)}
                      className={`py-3 rounded-xl border-2 transition-all capitalize text-sm font-bold ${
                        incidentType === t ? 'border-rose-600 bg-rose-50 text-rose-700 shadow-sm' : 'border-slate-100 bg-white text-slate-600'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-2">Description</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border-2 border-slate-100 rounded-xl p-4 focus:border-rose-500 focus:outline-none min-h-[120px]"
                  placeholder="What is happening? Provide landmarks if possible."
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={handleCaptureLocation}
                  disabled={isCapturingLocation}
                  className="flex items-center justify-center gap-3 p-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95 shadow-md"
                >
                  <MapPin className="w-5 h-5" />
                  {isCapturingLocation ? 'Capturing...' : location ? 'Location Fixed' : 'Get My Location'}
                </button>
                
                <div className="relative">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="w-full flex items-center justify-center gap-3 p-4 border-2 border-rose-100 rounded-xl font-bold text-rose-600 bg-rose-50/30 hover:bg-rose-50 transition-colors shadow-sm"
                  >
                    <Camera className="w-5 h-5" />
                    {imagePreview ? 'Retake Photo' : 'Capture Evidence'}
                  </button>
                </div>
              </div>

              {imagePreview && (
                <div className="relative mt-4 group">
                  <img src={imagePreview} className="w-full h-48 object-cover rounded-xl border-4 border-slate-100 shadow-md" alt="Preview" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                     <button 
                      type="button"
                      onClick={() => setImagePreview(null)}
                      className="bg-white text-rose-600 p-2 rounded-full font-bold flex items-center gap-2 shadow-lg"
                    >
                      <X className="w-5 h-5" /> Remove
                    </button>
                  </div>
                </div>
              )}

              {location && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl animate-in slide-in-from-top duration-300 shadow-inner">
                  <p className="text-xs font-black text-emerald-800 flex items-center gap-2 uppercase tracking-widest mb-2">
                    <MapPin className="w-3 h-3" /> Live GPS Active
                  </p>
                  <input 
                    type="text" 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Describe exact location (e.g. 2nd floor, blue building)"
                    className="w-full bg-transparent border-b border-emerald-200 focus:border-emerald-500 focus:outline-none text-emerald-900 placeholder:text-emerald-300 font-bold"
                  />
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !location}
            className="w-full bg-rose-600 text-white p-5 rounded-2xl shadow-xl shadow-rose-200 font-black tracking-[0.1em] text-lg flex items-center justify-center gap-3 hover:bg-rose-700 transition-all disabled:opacity-50 active:scale-95"
          >
            <Send className="w-6 h-6" />
            {isSubmitting ? 'TRANSMITTING...' : 'SEND EMERGENCY ALERT'}
          </button>
        </form>
      ) : view === 'history' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-2 px-1">
             <h3 className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Incident History</h3>
             <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">{myReports.length} Reports</span>
          </div>
          {myReports.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border-2 border-dashed border-slate-200">
              <AlertTriangle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-medium">No prior incident reports.</p>
            </div>
          ) : (
            myReports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((report) => (
              <div key={report.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex gap-4 hover:border-rose-200 transition-all">
                <img src={report.imageUrl} className="w-24 h-24 object-cover rounded-lg border shadow-inner bg-slate-100 shrink-0" alt="Incident" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1 gap-2">
                    <span className="text-[9px] font-black uppercase text-rose-600 bg-rose-50 px-2 py-0.5 rounded tracking-tighter whitespace-nowrap">{report.incidentType}</span>
                    <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">{new Date(report.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm truncate">{report.addressLandmark}</h4>
                  <div className="mt-3 flex items-center justify-between">
                    <span className={`text-[8px] font-black uppercase px-2 py-1 rounded tracking-tighter shadow-sm ${
                      report.currentStatus === 'resolved' ? 'bg-emerald-500 text-white' : 
                      report.currentStatus === 'submitted' ? 'bg-rose-100 text-rose-700' : 'bg-blue-600 text-white'
                    }`}>
                      {report.currentStatus.replace('_', ' ')}
                    </span>
                    <span className="text-[9px] font-bold text-slate-300">ID: {report.id}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
            <div className="relative inline-block">
              <div className="w-28 h-28 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border-4 border-white">
                <UserIcon className="w-14 h-14" />
              </div>
              {user.accountVerificationStatus === 'verified' && (
                <div className="absolute bottom-6 right-0 bg-emerald-500 text-white p-1.5 rounded-full border-4 border-white shadow-md">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              )}
            </div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{user.fullName}</h3>
            <p className="text-slate-500 font-medium">{user.phone}</p>
            
            <div className={`mt-6 inline-flex items-center gap-2 px-6 py-2 rounded-full border-2 font-black uppercase text-[10px] tracking-[0.15em] ${
               user.accountVerificationStatus === 'verified' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm' :
               user.accountVerificationStatus === 'pending' ? 'border-amber-200 bg-amber-50 text-amber-700' :
               'border-slate-200 bg-slate-50 text-slate-500'
            }`}>
              {user.accountVerificationStatus === 'verified' ? (
                <>TRUSTED CITIZEN RESPONDER</>
              ) : user.accountVerificationStatus === 'pending' ? (
                <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> DOCUMENT REVIEW IN PROGRESS</>
              ) : (
                <><AlertTriangle className="w-3.5 h-3.5" /> UNVERIFIED ACCOUNT</>
              )}
            </div>
          </div>

          {user.accountVerificationStatus === 'unverified' && (
            <div className="bg-rose-50 border-2 border-rose-200 p-6 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform group-hover:scale-110">
                <ShieldCheck className="w-32 h-32 text-rose-600" />
              </div>
              <h4 className="font-black text-rose-800 mb-2 flex items-center gap-2 uppercase tracking-tight text-sm">
                <ShieldCheck className="w-5 h-5" />
                Increase Reliability
              </h4>
              <p className="text-xs text-rose-700 mb-6 font-medium leading-relaxed">
                Reports from verified accounts are given immediate priority. Upload your Government ID to become a trusted source.
              </p>
              
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={idInputRef}
                onChange={handleIdUpload}
              />
              <button 
                onClick={() => idInputRef.current?.click()}
                className="w-full bg-rose-600 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-rose-700 transition-all shadow-lg active:scale-95"
              >
                <Upload className="w-4 h-4" />
                Verify Identity
              </button>
            </div>
          )}

          {user.idImageUrl && (
            <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest text-center">Document Evidence</p>
              <img src={user.idImageUrl} className="w-full h-48 object-contain rounded-lg bg-slate-50 border border-slate-100 shadow-inner" alt="ID Document" />
              {user.accountVerificationStatus === 'pending' && (
                <p className="mt-4 text-center text-[10px] text-amber-600 font-black uppercase italic tracking-widest">
                  Queued for manual dispatch review
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center">
          <div className="absolute top-0 w-full p-6 flex justify-between items-center text-white bg-gradient-to-b from-black/90 to-transparent z-[110]">
            <div className="flex items-center gap-3">
              <div className="w-3.5 h-3.5 bg-red-600 rounded-full animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.9)]" />
              <h4 className="font-black uppercase text-xs tracking-widest">Tactical Evidence Feed</h4>
            </div>
            <button 
              onClick={stopCamera} 
              className="bg-white/20 p-2.5 rounded-full hover:bg-rose-600 transition-colors shadow-lg"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="w-full max-w-lg aspect-[3/4] bg-slate-900 relative overflow-hidden md:rounded-3xl border-[6px] border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              className={`w-full h-full object-cover ${cameraFacing === 'user' ? 'scale-x-[-1]' : ''}`}
            />
            
            {/* Camera Controls Overlay */}
            <div className="absolute bottom-4 left-4 flex flex-col gap-2">
               <button 
                  onClick={toggleCamera}
                  className="bg-black/50 backdrop-blur-md text-white p-3 rounded-full border border-white/20 hover:bg-white/20 transition-colors"
                  title="Switch Camera"
                >
                  <FlipHorizontal className="w-5 h-5" />
                </button>
            </div>

            {/* Viewfinder Overlay */}
            <div className="absolute inset-0 border-[40px] border-black/30 pointer-events-none">
              <div className="w-full h-full border border-white/20 rounded-2xl flex items-center justify-center">
                <div className="w-12 h-12 border-2 border-white/20 rounded-full opacity-20" />
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-6">
            <button 
              type="button"
              onClick={takePhoto}
              className="w-24 h-24 bg-white rounded-full flex items-center justify-center p-1 border-[8px] border-slate-200/50 shadow-2xl active:scale-90 transition-all hover:border-white"
            >
              <div className="w-full h-full bg-rose-600 rounded-full flex items-center justify-center hover:bg-rose-700 transition-colors shadow-inner">
                <Camera className="w-10 h-10 text-white" />
              </div>
            </button>
            <p className="text-white/70 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">
              Center Incident & Snap
            </p>
          </div>
          
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
};

export default CitizenPortal;
