import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, 
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendEmailVerification 
} from 'firebase/auth';
import { 
  getFirestore, doc, collection, query, orderBy, onSnapshot, addDoc, deleteDoc, setDoc, where, getDocs, updateDoc
} from 'firebase/firestore';
import { 
  Send, User, Clock, Eye, MessageSquare, Shield, Settings, Zap, ArrowLeft, Camera, Search, UserPlus, PlusCircle, LogIn, Mail, Smartphone, ArrowRight, BookOpen, FileText, Globe, LifeBuoy, ZapOff
} from 'lucide-react';

// --- Firebase Configuration and Setup (Mandatory Globals) ---
// ध्यान दें: ये वैरिएबल्स Netlify/Build Environment से आने चाहिए, या इन्हें वास्तविक मानों से बदलें।
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Firestore Paths
const CHAT_COLLECTION_PATH = `/artifacts/${appId}/public/data/flashchat`;
const PUBLIC_CHAT_DOC_ID = 'main_public_room';
const MESSAGE_SUBCOLLECTION = 'messages';
const USERS_COLLECTION = `/artifacts/${appId}/public/data/users`;
const PRIVATE_ROOMS_COLLECTION = `/artifacts/${appId}/public/data/private_chat_rooms`;

// --- THEME DEFINITIONS ---
const THEMES = {
    default: {
        bg: 'bg-gray-900', header: 'bg-gray-800', accent: 'text-red-500', button: 'bg-red-500 hover:bg-red-600', snap_new: 'bg-red-500 hover:bg-red-600', snap_sent: 'bg-indigo-600 hover:bg-indigo-700', crown: 'text-yellow-300'
    },
    premium: {
        bg: 'bg-gray-800', header: 'bg-gray-700', accent: 'text-yellow-400', button: 'bg-yellow-600 hover:bg-yellow-700 text-black', snap_new: 'bg-yellow-600 hover:bg-yellow-700 text-black', snap_sent: 'bg-blue-800 hover:bg-blue-700', crown: 'text-yellow-300'
    }
};

const NavItem = ({ icon: Icon, label, isActive, onClick, theme }) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center p-2 transition duration-200 ${
            isActive ? theme.accent : 'text-gray-400 hover:text-white'
        }`}
    >
        <Icon className="w-6 h-6" />
        <span className="text-xs mt-1">{label}</span>
    </button>
);

const AuthModal = ({ auth, setIsAuthenticated, setError, setIsAuthReady }) => {
    const [mode, setMode] = useState('login'); // 'login', 'signup', 'select'
    const [authType, setAuthType] = useState(null); // 'email', 'mobile'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (authType === 'email') {
                if (mode === 'signup') {
                    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    await sendEmailVerification(userCredential.user);
                    setError('साइनअप सफल! कृपया अपनी ईमेल की जांच करें और फिर लॉग इन करें।');
                    setMode('login');
                } else {
                    await signInWithEmailAndPassword(auth, email, password);
                    setIsAuthenticated(true);
                }
            } else if (authType === 'mobile') {
                setError('मोबाइल वेरिफिकेशन (OTP) फीचर जल्द ही आ रहा है। कृपया अभी ईमेल से साइनअप करें।');
            }
        } catch (e) {
            console.error("Auth Error:", e);
            setError(`साइनइन विफल: ${e.code}`);
        }
    };

    if (mode === 'select' || !authType) {
        return (
            <div className="p-8">
                <h2 className="text-3xl font-bold mb-6 text-white text-center">FlashChat में आपका स्वागत है</h2>
                <button onClick={() => setAuthType('email')} className="w-full mb-3 p-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold flex items-center justify-center transition duration-200">
                    <Mail className='w-5 h-5 mr-3'/> ईमेल से जारी रखें
                </button>
                <button onClick={() => setAuthType('mobile')} className="w-full p-4 rounded-xl bg-gray-600 hover:bg-gray-700 text-white font-bold flex items-center justify-center transition duration-200">
                    <Smartphone className='w-5 h-5 mr-3'/> मोबाइल नंबर से जारी रखें
                </button>
                <button 
                    onClick={async () => { await signInAnonymously(auth); setIsAuthenticated(true); setIsAuthReady(true); }}
                    className="w-full mt-6 text-sm text-gray-400 hover:text-white"
                >
                    या अतिथि (Guest) के रूप में साइन इन करें
                </button>
            </div>
        );
    }


    return (
        <div className="p-8">
            <h2 className="text-3xl font-bold mb-6 text-white text-center">{mode === 'signup' ? 'नया खाता बनाएं' : 'लॉग इन करें'}</h2>
            
            <form onSubmit={handleSubmit}>
                {authType === 'email' && (
                    <>
                        <input type="email" placeholder="ईमेल" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 mb-3 rounded-lg bg-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500" required/>
                        <input type="password" placeholder="पासवर्ड (कम से कम 6 अक्षर)" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 mb-4 rounded-lg bg-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500" required minLength={6}/>
                        {mode === 'signup' && (<p className="text-xs text-gray-400 mb-4">साइनअप के बाद ईमेल वेरिफिकेशन लिंक भेजा जाएगा।</p>)}
                        <button type="submit" className="w-full p-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition duration-200 flex items-center justify-center">
                            {mode === 'signup' ? 'साइनअप करें' : 'लॉग इन करें'} <ArrowRight className='w-4 h-4 ml-2' />
                        </button>
                    </>
                )}
                {authType === 'mobile' && (
                    <>
                        <input type="tel" placeholder="मोबाइल नंबर (OTP के लिए)" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-3 mb-4 rounded-lg bg-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500" required/>
                        <button type="submit" className="w-full p-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition duration-200">
                            OTP भेजें
                        </button>
                    </>
                )}
            </form>

            <button onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')} className="w-full mt-4 text-sm text-gray-400 hover:text-white">
                {mode === 'signup' ? 'पहले से खाता है? लॉग इन करें' : 'नया खाता चाहिए? साइनअप करें'}
            </button>
            <button onClick={() => setAuthType(null)} className="w-full mt-2 text-xs text-gray-500 hover:text-gray-300">
                वापस जाएं
            </button>
        </div>
    );
};

const FriendsScreen = ({ db, userId, setError, theme, profile }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchTerm.trim() || !db) return;
        setIsSearching(true);
        setSearchResults([]);
        try {
            const usersRef = collection(db, USERS_COLLECTION);
            const q = query(usersRef, where('displayName', '>=', searchTerm), where('displayName', '<=', searchTerm + '\uf8ff'));
            const snapshot = await getDocs(q);
            const results = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(user => user.id !== userId);
            setSearchResults(results);
        } catch (e) {
            console.error("Search failed:", e);
            setError("यूज़र्स को खोजने में विफल।");
        } finally { setIsSearching(false); }
    };
    
    const handleFollow = (targetId, targetName) => {
        setError(`Future feature: आपने ${targetName} को फॉलो करना शुरू कर दिया है।`);
    };

    return (
        <div className="p-4">
            <h3 className={`text-2xl font-bold ${theme.accent} mb-4 flex items-center`}>
                <UserPlus className='w-6 h-6 mr-2'/> Friends & Search
            </h3>
            <form onSubmit={handleSearch} className="flex items-center mb-6 space-x-2">
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="नाम से यूज़र को खोजें (e.g., FlashUser)..." className="flex-grow p-3 rounded-full bg-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"/>
                <button type="submit" disabled={isSearching} className={`p-3 rounded-full ${theme.button} transition duration-200`}>
                    <Search className="w-6 h-6" />
                </button>
            </form>
            <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-300 mb-3">Friends Search Results ({searchResults.length})</h4>
                {isSearching && <p className='text-gray-400'>Searching...</p>}
                {searchResults.length === 0 && !isSearching && (<p className='text-gray-500 text-sm'>{searchTerm.trim() ? `"${searchTerm}" के लिए कोई यूज़र नहीं मिला।` : 'Display Name से यूज़र को खोजने के लिए सर्च करें।'} </p>)}
                <div className="space-y-2">
                    {searchResults.map(user => (
                        <div key={user.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg shadow-md">
                            <div className="flex items-center">
                                <User className='w-5 h-5 mr-3 text-red-500'/>
                                <span className="font-medium text-white">{user.displayName}</span>
                                {user.isPremium && <span className="ml-2 text-yellow-300 text-base">👑</span>}
                            </div>
                            <button onClick={() => handleFollow(user.id, user.displayName)} className={`text-sm py-1 px-3 rounded-full transition duration-200 flex items-center ${theme.button}`}>
                                <UserPlus className='w-4 h-4 mr-1'/> Follow
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


const App = () => {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState({ displayName: '', isPremium: false, bio: '' });
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [viewingMessage, setViewingMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('chat');
  const [currentChatId, setCurrentChatId] = useState(PUBLIC_CHAT_DOC_ID);
  const [roomName, setRoomName] = useState('Public Room');

  const currentTheme = profile.isPremium ? THEMES.premium : THEMES.default;

  // --- Initialization and Auth ---
  useEffect(() => {
    try {
      if (Object.keys(firebaseConfig).length === 0) throw new Error("Firebase config not available.");
      
      const app = initializeApp(firebaseConfig);
      const firestoreDb = getFirestore(app);
      const firebaseAuth = getAuth(app);
      
      setDb(firestoreDb);
      setAuth(firebaseAuth);

      const unsubscribeAuth = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
            setUserId(user.uid);
            setIsAuthenticated(true);
            setIsAuthReady(true);
        } else if (initialAuthToken) {
            await signInWithCustomToken(firebaseAuth, initialAuthToken);
        } else {
            setIsLoading(false); 
            setIsAuthReady(true);
        }
      });
      
      return () => unsubscribeAuth();
    } catch (e) {
      console.error("Firebase setup failed:", e);
      setError("Firebase setup failed. Please check the console.");
      setIsLoading(false);
    }
  }, []);

  // --- Profile Management ---
  useEffect(() => {
    if (!db || !userId) return;

    const userDocRef = doc(db, USERS_COLLECTION, userId);
    
    const initialSetup = async () => {
        try {
            await setDoc(userDocRef, { 
                displayName: `User_${userId.substring(0, 6)}`,
                isPremium: false,
                bio: 'Hey there! I am using FlashChat!',
                lastActive: Date.now()
            }, { merge: true });
        } catch (e) {
            console.error("Profile setup failed:", e);
        }
    };
    initialSetup();

    const unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const defaultName = `User_${userId.substring(0, 6)}`;
            
            setProfile({
                displayName: data.displayName || defaultName,
                isPremium: data.isPremium || false,
                bio: data.bio || 'Hey there! I am using FlashChat!'
            });

            if (data.displayName === defaultName) {
                setShowProfileModal(true);
            }
        }
    });

    return () => unsubscribeProfile();
  }, [db, userId]);


  // --- Real-Time Message Listener ---
  useEffect(() => {
    if (!db || !isAuthReady || !isAuthenticated || currentScreen !== 'chat' || !currentChatId) return;
    
    const chatCollectionPath = currentChatId === PUBLIC_CHAT_DOC_ID ? CHAT_COLLECTION_PATH : PRIVATE_ROOMS_COLLECTION;

    const messagesRef = collection(db, chatCollectionPath, currentChatId, MESSAGE_SUBCOLLECTION);
    const q = query(messagesRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    }, (e) => {
      console.error("Error fetching messages:", e);
      setError("Failed to load chat messages.");
    });

    return () => unsubscribe();
  }, [db, isAuthReady, isAuthenticated, currentScreen, currentChatId]);

  // --- Core Message Logic (SendMessage, DeleteSelf, HandleAction) ---
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !db || !userId) return;
    if (profile.displayName.startsWith('User_') && profile.displayName.length > 7) {
      setError("चैट करने से पहले कृपया अपना नाम सेट करें!");
      setShowProfileModal(true);
      return;
    }
    const chatCollectionPath = currentChatId === PUBLIC_CHAT_DOC_ID ? CHAT_COLLECTION_PATH : PRIVATE_ROOMS_COLLECTION;
    const messagesRef = collection(db, chatCollectionPath, currentChatId, MESSAGE_SUBCOLLECTION);

    const messagePayload = { senderId: userId, senderName: profile.displayName, isPremium: profile.isPremium, text: newMessage.trim(), timestamp: Date.now(), viewedBy: [], type: 'text' };
    try {
      await addDoc(messagesRef, messagePayload);
      setNewMessage(''); setError(''); 
    } catch (e) { console.error("Error sending message: ", e); setError("स्नैप भेजने में विफल।"); }
  };

  const handleMessageAction = useCallback((message) => {
    if (!db || !userId || viewingMessage) return;
    const alreadyViewed = message.viewedBy && message.viewedBy.includes(userId);
    
    if (message.senderId === userId) { deleteSelfMessage(message.id); return; } 
    if (alreadyViewed) { setError("स्नैप पहले ही देखा जा चुका है! अब यह डिलीट होने वाला है।"); return; }

    setViewingMessage(message);
    const chatCollectionPath = currentChatId === PUBLIC_CHAT_DOC_ID ? CHAT_COLLECTION_PATH : PRIVATE_ROOMS_COLLECTION;
    const messageDocRef = doc(db, chatCollectionPath, currentChatId, MESSAGE_SUBCOLLECTION, message.id);
    const updatedViewedBy = [...(message.viewedBy || []), userId];
    
    setDoc(messageDocRef, { viewedBy: updatedViewedBy }, { merge: true }).catch(e => console.error("Error marking message as viewed:", e));

    const VIEW_TIME_MS = 4000; 
    setTimeout(async () => {
      try { await deleteDoc(messageDocRef); } 
      catch (e) { console.warn('Snap likely already deleted by another viewer.'); } 
      finally { setViewingMessage(null); }
    }, VIEW_TIME_MS);
  }, [db, userId, viewingMessage, currentChatId]);

  const deleteSelfMessage = async (id) => {
    if (!db) return;
    try {
        const chatCollectionPath = currentChatId === PUBLIC_CHAT_DOC_ID ? CHAT_COLLECTION_PATH : PRIVATE_ROOMS_COLLECTION;
        const messageDocRef = doc(db, chatCollectionPath, currentChatId, MESSAGE_SUBCOLLECTION, id);
        await deleteDoc(messageDocRef);
        setError('');
    } catch (e) { console.error("Error deleting self message:", e); setError("आपका मैसेज डिलीट नहीं हो सका।"); }
  };
  
  // --- Room Management Functions ---
  const handleCreateRoom = async () => {
    if (!profile.isPremium) { setError("🔒 केवल प्रीमियम सदस्य ही चैट रूम बना सकते हैं! ₹59 में अपग्रेड करें।"); setShowProfileModal(true); return; }
    const roomNamePrompt = prompt("नए रूम का नाम दर्ज करें (जैसे: My Secret Group)");
    if (!roomNamePrompt || roomNamePrompt.trim().length < 3) { setError("रूम का नाम 3 अक्षरों से बड़ा होना चाहिए।"); return; }
    try {
      const roomsRef = collection(db, PRIVATE_ROOMS_COLLECTION);
      const newRoom = await addDoc(roomsRef, { name: roomNamePrompt.trim(), creatorId: userId, creatorName: profile.displayName, createdAt: Date.now(), members: [userId], isPrivate: true });
      setCurrentChatId(newRoom.id); setRoomName(roomNamePrompt.trim());
      setError(`🎉 रूम '${roomNamePrompt.trim()}' बनाया गया! रूम ID: ${newRoom.id}`);
    } catch (e) { console.error("Error creating room:", e); setError("रूम बनाने में विफल।"); }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    const inputId = e.target.elements.joinRoomInput.value.trim();
    if (!inputId) return;
    try {
      const roomDocRef = doc(db, PRIVATE_ROOMS_COLLECTION, inputId);
      const roomSnap = await getDoc(roomDocRef);

      if (roomSnap.exists()) {
        const roomData = roomSnap.data();
        if (!roomData.members.includes(userId)) {
            await updateDoc(roomDocRef, { members: [...roomData.members, userId] });
        }
        setCurrentChatId(inputId); setRoomName(roomData.name);
        setError(`🥳 रूम '${roomData.name}' में शामिल हो गए!`);
      } else { setError("रूम ID गलत है या रूम मौजूद नहीं है।"); }
    } catch (e) { console.error("Error joining room:", e); setError("रूम में शामिल होने में विफल।"); }
  };

  const handleLeaveRoom = () => {
    setCurrentChatId(PUBLIC_CHAT_DOC_ID); setRoomName('Public Room'); setMessages([]);
    setError("आप पब्लिक रूम पर वापस आ गए हैं।");
  };

  const handleLogout = async () => {
      if (auth) {
          await signOut(auth);
          setUserId(null); setIsAuthenticated(false); setMessages([]);
          setCurrentChatId(PUBLIC_CHAT_DOC_ID); setRoomName('Public Room');
          setError('आप सफलतापूर्वक लॉगआउट कर चुके हैं।');
      }
  };
  
  // --- Profile/Premium Logic ---
  const updateProfile = async (e) => {
    e.preventDefault();
    const newName = e.target.elements.displayNameInput.value.trim();
    const newBio = e.target.elements.bioInput.value.trim();

    if (!newName || !db || !userId || newName.length < 3 || newName.length > 20) {
      alert("नाम 3-20 अक्षरों का होना चाहिए।");
      return;
    }
    if (newBio.length > 160) {
        alert("बायो 160 अक्षरों से अधिक नहीं होना चाहिए।");
        return;
    }

    try {
      const userDocRef = doc(db, USERS_COLLECTION, userId);
      await setDoc(userDocRef, { displayName: newName, bio: newBio }, { merge: true });
      setShowProfileModal(false);
      setError("प्रोफ़ाइल सफलतापूर्वक अपडेट हुई।");
    } catch (e) { console.error("Error updating profile:", e); setError("प्रोफ़ाइल अपडेट करने में विफल।"); }
  };

  const togglePremiumStatus = async () => {
    if (!db || !userId) return;
    try {
      const userDocRef = doc(db, USERS_COLLECTION, userId);
      const newPremiumStatus = !profile.isPremium;
      await setDoc(userDocRef, { isPremium: newPremiumStatus }, { merge: true });
      setError(newPremiumStatus ? '🎉 प्रीमियम सक्रिय! आपके स्नैप्स अब चमकते हैं और आप रूम बना सकते हैं।' : '😔 प्रीमियम निष्क्रिय कर दिया गया।');
    } catch (e) { console.error("Error toggling premium:", e); setError("प्रीमियम स्थिति बदलने में विफल।"); }
  };
  
  const handleCameraClick = () => {
    setError("📸 फ़ोटो/वीडियो स्नैप फीचर जल्द ही आ रहा है! अभी आप टेक्स्ट स्नैप भेज सकते हैं।");
  };

  // --- UI Components ---
  const MessageItem = ({ message }) => {
    const isSender = message.senderId === userId;
    const isViewed = message.viewedBy && message.viewedBy.length > 0;
    const isNewSnap = !isViewed && !isSender;
    const snapNewClass = currentTheme.snap_new;
    const snapSentClass = currentTheme.snap_sent;

    let icon = <Eye className="w-5 h-5" />;
    let statusText = 'देखने के लिए टैप करें (डिलीट हो जाएगा!)';
    let statusClass = `${snapNewClass} text-white`;
    
    if (isSender) {
        icon = <Zap className="w-5 h-5 text-white" />; statusText = 'स्नैप भेजा (डिलीट करने के लिए टैप करें)'; statusClass = `${snapSentClass} text-white`;
    } else if (isViewed) {
        icon = <Clock className="w-5 h-5 text-gray-400" />; statusText = 'देखा गया (जल्द डिलीट)'; statusClass = 'bg-gray-700 text-gray-400 cursor-default';
    }

    return (
      <div className={`flex items-center p-3 my-2 mx-2 rounded-xl shadow-lg transition duration-200 ${isNewSnap || isSender ? 'cursor-pointer' : 'cursor-default'} ${statusClass}`} onClick={() => isNewSnap || isSender ? handleMessageAction(message) : null}>
        <div className="flex-shrink-0 mr-3">{icon}</div>
        <div className="flex-grow flex items-center">
          <p className="font-bold text-sm truncate mr-2">{isSender ? 'आप' : message.senderName || 'अज्ञात उपयोगकर्ता'}</p>
          {message.isPremium && (<span className={`${currentTheme.crown} text-base font-black ml-1`} title="प्रीमियम उपयोगकर्ता">👑</span>)}
        </div>
        <p className="text-xs opacity-80 flex-shrink-0">{statusText}</p>
        {isNewSnap && (<div className="text-sm font-extrabold ml-2 p-1 px-2 rounded-full bg-yellow-400 text-black animate-pulse">नया</div>)}
      </div>
    );
  };
  
  const ChatScreen = () => {
      const [joinRoomInput, setJoinRoomInput] = useState('');

      return (
    <>
        <main className="flex-grow overflow-y-auto p-2" style={{ maxHeight: 'calc(100vh - 150px)' }}>
            <div className={`p-2 ${currentTheme.header} ${currentTheme.accent} rounded-lg mx-2 mb-4 text-center text-xs font-semibold flex items-center justify-center`}>
                <Shield className='w-4 h-4 mr-2'/>
                {currentChatId === PUBLIC_CHAT_DOC_ID ? 'पब्लिक रूम' : `रूम: ${roomName} (ID: ${currentChatId.substring(0, 8)}...)`} | स्नैप्स गायब!
            </div>
            
            <div className='flex justify-between items-center mx-2 mb-4 space-x-2'>
                <button onClick={handleCreateRoom} className={`flex-grow p-3 rounded-xl shadow-lg font-bold text-sm transition duration-200 text-white ${profile.isPremium ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 cursor-not-allowed'}`}>
                    <PlusCircle className='w-4 h-4 mr-1 inline'/> New Room (Premium)
                </button>
                {currentChatId !== PUBLIC_CHAT_DOC_ID && (
                    <button onClick={handleLeaveRoom} className={`p-3 rounded-xl shadow-lg font-bold text-sm transition duration-200 text-white bg-red-600 hover:bg-red-700`}>
                        <ArrowLeft className='w-4 h-4 inline'/> Leave
                    </button>
                )}
            </div>

            {currentChatId === PUBLIC_CHAT_DOC_ID && (
                <form onSubmit={handleJoinRoom} className="flex items-center mx-2 mb-4 space-x-2">
                    <input type="text" name="joinRoomInput" value={joinRoomInput} onChange={(e) => setJoinRoomInput(e.target.value)} placeholder="या रूम ID डालकर जॉइन करें..." className="flex-grow p-3 rounded-full bg-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm"/>
                    <button type="submit" className={`p-3 rounded-full ${currentTheme.button} transition duration-200`}>
                        <UserPlus className="w-5 h-5" />
                    </button>
                </form>
            )}

            {messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-10 p-5">
                    <MessageSquare className="w-16 h-16 mx-auto mb-3" />
                    <p className='text-xl'>कोई स्नैप नहीं।</p><p className='text-sm mt-3'>इस रूम में पहले स्नैप भेजें!</p>
                </div>
            ) : (
                <div className='pb-4'>
                    {messages.map(msg => (<MessageItem key={msg.id} message={msg} />))}
                </div>
            )}
        </main>

        <div className={`bg-gray-800 p-4 border-t border-gray-700 shadow-2xl`}>
            <form onSubmit={sendMessage} className="flex items-center space-x-3">
            <button type="button" onClick={handleCameraClick} className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 transition duration-300 shadow-lg" aria-label="Send Photo Snap" disabled={!isAuthReady || viewingMessage}>
                <Camera className="w-6 h-6 text-white" />
            </button>
            <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="अपना स्नैप मैसेज टाइप करें (इमोजी समर्थित)..." className="flex-grow p-3 rounded-full bg-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition duration-200" disabled={!isAuthReady || viewingMessage}/>
            <button type="submit" disabled={!isAuthReady || newMessage.trim() === '' || viewingMessage} className={`p-4 rounded-full transition duration-300 shadow-xl ${!isAuthReady || newMessage.trim() === '' || viewingMessage ? 'bg-gray-600 cursor-not-allowed': `${currentTheme.button} transform hover:scale-110`}`} aria-label="Send Text Snap">
                <Send className="w-6 h-6 text-white" />
            </button>
            </form>
        </div>
    </>
  )};
  
  if (isLoading || (!isAuthenticated && !isAuthReady)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-yellow-400"></div>
        <p className="ml-4 text-xl font-medium">FlashChat लोड हो रहा है...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
            <div className="bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full border-t-4 border-red-500">
                {error && <div className="bg-red-600 p-3 text-center mx-auto w-full text-sm font-medium">{error}</div>}
                <AuthModal auth={auth} setIsAuthenticated={setIsAuthenticated} setError={setError} setIsAuthReady={setIsAuthReady}/>
            </div>
        </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans text-white max-w-lg mx-auto shadow-2xl ${currentTheme.bg}`}>
      <header className={`${currentTheme.header} p-4 flex items-center justify-between shadow-xl sticky top-0 z-10`}>
        <div className="flex items-center">
            <Zap className={`w-8 h-8 mr-2 ${currentTheme.accent}`} />
            <span className="text-2xl font-black tracking-widest text-white">FlashChat</span>
        </div>
        <button 
          onClick={() => setShowProfileModal(true)}
          className={`text-sm bg-gray-700 hover:bg-gray-600 transition duration-200 rounded-full py-1 px-3 flex items-center border border-gray-600 ${currentTheme.accent}`}
        >
            <User className="w-4 h-4 mr-1"/>
            {profile.displayName || 'नाम सेट करें'}
            {profile.isPremium && <span className="ml-1 text-yellow-300">👑</span>}
        </button>
      </header>
      
      {error && (
        <div className="bg-red-600 p-3 rounded-t-none text-center mx-auto w-full text-sm font-medium animate-pulse">
            {error}
        </div>
      )}

      <div className="flex-grow overflow-y-auto" style={{ paddingBottom: '70px' }}>
          {currentScreen === 'chat' && <ChatScreen />}
          {currentScreen === 'friends' && <FriendsScreen db={db} userId={userId} setError={setError} theme={currentTheme} profile={profile}/>}
      </div>
      
      <footer className={`fixed bottom-0 w-full max-w-lg ${currentTheme.header} border-t border-gray-700 shadow-3xl flex justify-around z-20`}>
        <NavItem icon={MessageSquare} label="Chat" isActive={currentScreen === 'chat'} onClick={() => setCurrentScreen('chat')} theme={currentTheme} />
        <NavItem icon={UserPlus} label="Friends" isActive={currentScreen === 'friends'} onClick={() => setCurrentScreen('friends')} theme={currentTheme} />
        <NavItem icon={Camera} label="Snap" isActive={false} onClick={handleCameraClick} theme={currentTheme} />
        <NavItem icon={LogIn} label="Logout" isActive={false} onClick={handleLogout} theme={currentTheme} />
      </footer>

      {/* MESSAGE VIEWER MODAL */}
      {viewingMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex flex-col items-center justify-center p-4">
          <div className="absolute top-4 right-4 text-gray-300 text-sm flex items-center">
            <Clock className="w-4 h-4 mr-1"/> 4 सेकंड में गायब...
          </div>
          <div className="text-3xl font-bold text-yellow-400 mb-4">{viewingMessage.senderName} से स्नैप</div>
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-full w-96 text-gray-900 text-xl font-medium text-center border-4 border-red-500">{viewingMessage.text}</div>
          <p className="mt-8 text-gray-400 text-sm">देखना खत्म हुआ, अब यह मैसेज डिलीट हो जाएगा!</p>
        </div>
      )}

      {/* PROFILE/MONETIZATION/HELP MODAL */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className={`${currentTheme.header} p-6 rounded-xl shadow-2xl max-w-sm w-full border-t-4 border-red-500 my-8`}>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white flex items-center">
                    <Settings className={`w-6 h-6 mr-2 ${currentTheme.accent}`}/> प्रोफ़ाइल सेटिंग्स
                </h2>
                <button onClick={() => setShowProfileModal(false)} className='text-gray-400 hover:text-white'><ArrowLeft className='w-6 h-6' /></button>
            </div>
            
            <p className='text-xs text-gray-500 mb-4'>आपकी यूज़र ID: {userId}</p>

            <form onSubmit={updateProfile}>
                <label className="block text-sm font-medium text-gray-300 mb-1">नाम (Display Name)</label>
                <input type="text" name="displayNameInput" defaultValue={profile.displayName} placeholder="जैसे: FlashUser123" className="w-full p-3 rounded-lg bg-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 mb-4" minLength={3} maxLength={20} required/>
                
                <label className="block text-sm font-medium text-gray-300 mb-1 flex justify-between">
                    बायो (Bio)
                    <span className='text-gray-500'>अधिकतम 160 अक्षर</span>
                </label>
                <textarea name="bioInput" defaultValue={profile.bio} placeholder="मैं स्नैपचैट का भारतीय विकल्प उपयोग कर रहा हूँ!" className="w-full p-3 rounded-lg bg-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 mb-4" maxLength={160} rows={3}></textarea>
                
                <button type="submit" className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 rounded-lg transition duration-200 shadow-md">
                    प्रोफ़ाइल सेव करें
                </button>
            </form>

            <div className="mt-6 border-t border-gray-700 pt-4">
                <h3 className={`text-xl font-bold mb-3 flex items-center ${currentTheme.accent}`}>
                    <Zap className='w-5 h-5 mr-2'/> FlashChat Premium (₹59/माह)
                </h3>
                <ul className="text-sm text-gray-400 space-y-2 mb-4">
                    <li className='flex items-start'><PlusCircle className='w-4 h-4 mr-2 text-green-500 mt-1'/> निजी रूम बनाएं</li>
                    <li className='flex items-start'><ZapOff className='w-4 h-4 mr-2 text-green-500 mt-1'/> Exclusive Themes</li>
                </ul>
                
                <button onClick={togglePremiumStatus} className={`w-full font-bold py-3 rounded-lg transition duration-200 shadow-lg ${profile.isPremium ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white`}>
                    {profile.isPremium ? '✅ प्रीमियम सक्रिय (निष्क्रिय करें)' : '💰 ₹59 में प्रीमियम अपग्रेड करें'}
                </button>
            </div>

            {/* --- NEW HELP & LEGAL SECTION --- */}
            <div className="mt-6 border-t border-gray-700 pt-4">
                <h3 className={`text-xl font-bold mb-3 flex items-center text-indigo-400`}>
                    <LifeBuoy className='w-5 h-5 mr-2'/> सहायता और कानूनी
                </h3>
                <div className='space-y-2'>
                    <a href="#" className='flex items-center text-sm text-gray-300 hover:text-white p-2 rounded-lg bg-gray-700/50 transition duration-150'>
                        <BookOpen className='w-4 h-4 mr-3 text-yellow-400'/>
                        FAQs / उपयोग कैसे करें (How to Use)
                    </a>
                    <a href="mailto:support@flashchat.in" className='flex items-center text-sm text-gray-300 hover:text-white p-2 rounded-lg bg-gray-700/50 transition duration-150'>
                        <Mail className='w-4 h-4 mr-3 text-red-400'/>
                        समर्थन से संपर्क करें (Contact Support)
                    </a>
                    <a href="#" className='flex items-center text-sm text-gray-300 hover:text-white p-2 rounded-lg bg-gray-700/50 transition duration-150'>
                        <FileText className='w-4 h-4 mr-3 text-green-400'/>
                        गोपनीयता नीति (Privacy Policy)
                    </a>
                    <a href="#" className='flex items-center text-sm text-gray-300 hover:text-white p-2 rounded-lg bg-gray-700/50 transition duration-150'>
                        <Globe className='w-4 h-4 mr-3 text-blue-400'/>
                        सेवा की शर्तें (Terms of Service)
                    </a>
                </div>
            </div>

            {/* --- MADE IN INDIA FOOTER --- */}
            <div className="mt-6 border-t border-gray-700 pt-4 text-center">
                <p className="text-xs font-semibold text-gray-400">⚡ FlashChat | Made in India 🇮🇳</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
