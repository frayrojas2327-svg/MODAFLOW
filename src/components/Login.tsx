import React, { useState } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile,
  db,
  setDoc,
  getDoc,
  doc
} from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, Sparkles, Eye, EyeOff, UserPlus, Building2, Mail, Lock, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import Logo from './Logo';

export default function Login({ onDemoLogin }: { onDemoLogin: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Load saved credentials on mount
  React.useEffect(() => {
    const savedUsername = localStorage.getItem('modaflow_username');
    const savedPassword = localStorage.getItem('modaflow_password');
    const savedRemember = localStorage.getItem('modaflow_remember') === 'true';

    if (savedRemember && savedUsername) {
      setUsername(savedUsername);
      if (savedPassword) setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Create profile if it doesn't exist
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            companyName: '',
            role: 'user',
            createdAt: new Date().toISOString()
          });
        }
      } catch (profileError) {
        console.error('Error checking/creating Google user profile:', profileError);
      }
      
      toast.success('¡Bienvenido a ModaFlow!');
    } catch (error: any) {
      console.error('Login error:', error);
      const errorCode = error.code;
      
      if (errorCode === 'auth/operation-not-allowed') {
        toast.error('Google no está habilitado', {
          description: 'Activa "Google" en tu consola de Firebase.',
          duration: 6000
        });
      } else if (errorCode === 'auth/popup-blocked') {
        toast.error('Ventana emergente bloqueada', {
          description: 'Por favor, permite las ventanas emergentes para este sitio.',
          duration: 6000
        });
      } else if (errorCode === 'auth/cancelled-popup-request') {
        // User closed the popup, no need for toast
      } else {
        toast.error('Error al conectar con Google', {
          description: error.message || 'Inténtalo de nuevo más tarde.',
          duration: 6000
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRegister = () => {
    setIsRegistering(!isRegistering);
    setUsername('');
    setPassword('');
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Save or clear credentials
    if (rememberMe) {
      localStorage.setItem('modaflow_username', username);
      localStorage.setItem('modaflow_password', password);
      localStorage.setItem('modaflow_remember', 'true');
    } else {
      localStorage.removeItem('modaflow_username');
      localStorage.removeItem('modaflow_password');
      localStorage.setItem('modaflow_remember', 'false');
    }
    
    // If user entered a username instead of email, append a default domain
    const trimmedUsername = username.trim();
    let email = trimmedUsername;
    
    if (!trimmedUsername.includes('@')) {
      // For usernames, remove all spaces to ensure a valid email format
      const sanitizedUsername = trimmedUsername.toLowerCase().replace(/\s+/g, '');
      if (!sanitizedUsername) {
        toast.error('Por favor, ingresa un nombre de usuario o correo válido.');
        setIsLoading(false);
        return;
      }
      email = `${sanitizedUsername}@modaflow.com`;
    } else {
      // For emails, remove all spaces to ensure a valid email format
      email = trimmedUsername.toLowerCase().replace(/\s+/g, '');
    }
    
    try {
      if (isRegistering) {
        // Validation for registration
        if (password.length < 6) {
          toast.error('La contraseña es muy corta', {
            description: 'Usa al menos 6 caracteres.',
            duration: 4000
          });
          setIsLoading(false);
          return;
        }

        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;
        
        // Create user profile
        try {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            displayName: trimmedUsername.split('@')[0],
            companyName: '',
            role: 'user',
            createdAt: new Date().toISOString()
          });
        } catch (profileError: any) {
          console.error('Error creating user profile:', profileError);
          // Even if profile creation fails, the user is created in Auth.
          // We don't want to block them, but we should notify.
        }
        
        toast.success('¡Bienvenido! Cuenta creada con éxito.');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('¡Sesión iniciada!');
      }
    } catch (error: any) {
      console.error('Auth error detail:', error);
      const errorCode = error.code;
      const errorMessage = error.message;
      
      if (errorCode === 'auth/wrong-password' || errorCode === 'auth/user-not-found' || errorCode === 'auth/invalid-credential') {
        const msg = isRegistering ? 'Error al crear la cuenta' : 'Usuario o contraseña incorrectos';
        const desc = isRegistering ? 'Inténtalo de nuevo con otros datos.' : 'Verifica tus datos e intenta de nuevo.';
        toast.error(msg, {
          description: desc,
          duration: 4000
        });
      } else if (errorCode === 'auth/invalid-email') {
        toast.error('El usuario o correo no es válido', {
          description: 'Asegúrate de no usar espacios o caracteres especiales.',
          duration: 4000
        });
      } else if (errorCode === 'auth/email-already-in-use') {
        toast.error('Este usuario o correo ya está en uso', {
          description: 'Prueba con otro nombre o inicia sesión.',
          duration: 5000
        });
      } else if (errorCode === 'auth/weak-password') {
        toast.error('La contraseña es muy corta', {
          description: 'Usa al menos 6 caracteres.',
          duration: 4000
        });
      } else if (errorCode === 'auth/too-many-requests') {
        toast.error('Demasiados intentos', {
          description: 'Por favor, espera un momento antes de intentar de nuevo.',
          duration: 6000
        });
      } else {
        toast.error('Error en el sistema', {
          description: errorMessage || 'Ocurrió un error inesperado. Inténtalo de nuevo.',
          duration: 5000
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md bg-black rounded-3xl border border-white/10 p-8 shadow-2xl space-y-6 text-center"
      >
        <div className="space-y-4">
          <Logo className="justify-center" />
          <p className="text-white/40 text-[15px] mt-1">
            {isRegistering ? 'Crea tu cuenta' : 'Gestiona tu marca de ropa'}
          </p>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
          <div className="space-y-1">
            <label htmlFor="username" className="text-[15px] font-bold text-white/40 uppercase tracking-widest ml-1">Usuario</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"><UserIcon className="w-4 h-4" /></span>
              <input 
                id="username"
                name="username"
                autoComplete="username"
                required
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-orange-500/50 transition-all text-[15px]"
                placeholder="Tu nombre de usuario"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-[15px] font-bold text-white/40 uppercase tracking-widest ml-1">Contraseña</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"><Lock className="w-4 h-4" /></span>
              <input 
                id="password"
                name="password"
                autoComplete={isRegistering ? "new-password" : "current-password"}
                required
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-12 focus:outline-none focus:border-orange-500/50 transition-all text-[15px]"
                placeholder="••••••••"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative flex items-center">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="w-4 h-4 border border-white/20 rounded bg-white/5 peer-checked:bg-orange-500 peer-checked:border-orange-500 transition-all" />
                <svg className="absolute w-3 h-3 text-black opacity-0 peer-checked:opacity-100 transition-opacity left-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-[15px] text-white/40 group-hover:text-white/60 transition-colors">Recordar mis datos</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-orange-500 text-black rounded-xl font-black text-[15px] flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-3 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                {isRegistering ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                {isRegistering ? 'Crear Cuenta' : 'Ingresar'}
              </>
            )}
          </button>
        </form>

        <div className="relative flex items-center gap-4 py-2">
          <div className="flex-1 h-[1px] bg-white/5" />
          <span className="text-[15px] font-bold text-white/20 uppercase tracking-widest">O</span>
          <div className="flex-1 h-[1px] bg-white/5" />
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full py-3.5 bg-white text-black rounded-xl font-black text-[15px] flex items-center justify-center gap-3 hover:bg-white/90 transition-all shadow-lg"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="Google" />
          Continuar con Google
        </button>

        <div className="pt-2">
          <button 
            onClick={toggleRegister}
            className="text-[15px] text-white/40 hover:text-orange-500 transition-colors"
          >
            {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate aquí'}
          </button>
        </div>

        <div className="p-4 bg-orange-500/5 rounded-2xl border border-orange-500/10 text-[15px] text-white/60 leading-relaxed italic">
          <Sparkles className="w-4 h-4 text-orange-500 mx-auto mb-1.5" />
          "Tu marca merece el mejor control financiero. Únete hoy."
        </div>
      </motion.div>
    </div>
  );
}
