import React, { useContext, useEffect, useRef, useState } from 'react'
import { userDataContext } from '../context/UserContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import aiImg from "../assets/ai.gif"
import { CgMenuRight } from "react-icons/cg"
import { RxCross1 } from "react-icons/rx"
import userImg from "../assets/user.gif"

function Home() {
  const { userData, serverUrl, setUserData, getGeminiResponse } = useContext(userDataContext)
  const navigate = useNavigate()

  const [started, setStarted]     = useState(false)
  const [Listening, setListening] = useState(false)
  const [userText, setUserText]   = useState("")
  const [aiText, setAiText]       = useState("")
  const [status, setStatus]       = useState("")
  const [ham, setHam]             = useState(false)

  const recognitionRef   = useRef(null)
  const isSpeakingRef    = useRef(false)
  const isRecognizingRef = useRef(false)
  const isMountedRef     = useRef(true)

  const handleLogOut = async () => {
    try { await axios.get(`${serverUrl}/api/auth/logout`, { withCredentials: true }) } catch (_) {}
    setUserData(null)
    navigate("/signin")
  }

  // ── Speak ────────────────────────────────────────────────────────────────────
  const speak = (text) =>
    new Promise((resolve) => {
      window.speechSynthesis.cancel()

      const voices = window.speechSynthesis.getVoices()
      const voice =
        voices.find(v => v.lang === 'en-IN') ||
        voices.find(v => v.lang === 'en-US') ||
        voices.find(v => v.lang.startsWith('en')) ||
        voices[0]

      const u = new SpeechSynthesisUtterance(text)
      if (voice) u.voice = voice
      u.lang = voice?.lang || 'en-US'
      u.rate = 1; u.pitch = 1; u.volume = 1

      isSpeakingRef.current = true
      u.onend   = () => { isSpeakingRef.current = false; resolve() }
      u.onerror = (e) => { console.warn('Speech error:', e.error); isSpeakingRef.current = false; resolve() }

      window.speechSynthesis.speak(u)
    })

  // ── Start mic ────────────────────────────────────────────────────────────────
  const startListening = () => {
    if (isSpeakingRef.current || isRecognizingRef.current || !recognitionRef.current) return
    try { recognitionRef.current.start() } catch (_) {}
  }

  // ── Set up SpeechRecognition once ────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert("Please use Google Chrome."); return }

    const rec = new SR()
    rec.continuous      = false
    rec.lang            = 'en-US'
    rec.interimResults  = false
    rec.maxAlternatives = 1
    recognitionRef.current = rec

    rec.onstart = () => {
      isRecognizingRef.current = true
      if (isMountedRef.current) { setListening(true); setStatus("Listening...") }
    }

    rec.onend = () => {
      isRecognizingRef.current = false
      if (isMountedRef.current) {
        setListening(false)
        if (!isSpeakingRef.current) setTimeout(() => startListening(), 300)
      }
    }

    rec.onerror = (e) => {
      isRecognizingRef.current = false
      if (isMountedRef.current) setListening(false)
      if (e.error === 'no-speech' || e.error === 'aborted') {
        if (!isSpeakingRef.current) setTimeout(() => startListening(), 300)
        return
      }
      console.warn("Mic error:", e.error)
      setTimeout(() => startListening(), 1000)
    }

    rec.onresult = async (e) => {
      const transcript = e.results[0][0].transcript.trim()
      console.log("✅ Heard:", transcript)

      if (!transcript.toLowerCase().includes(userData.assistantName.toLowerCase())) {
        console.log("❌ Name not detected")
        setStatus(`Say "${userData.assistantName}" to wake me`)
        setTimeout(() => setStatus(""), 2000)
        return
      }

      console.log("✅ Name detected! Processing...")
      try { rec.stop() } catch (_) {}
      isRecognizingRef.current = false
      setListening(false)
      setUserText(transcript)
      setStatus("Thinking...")

      try {
        const data = await getGeminiResponse(transcript)
        console.log("✅ Got response:", data)

        if (!data || !data.response) {
          console.log("❌ Empty response from backend")
          setStatus("No response — try again")
          setUserText("")
          setTimeout(() => { setStatus(""); startListening() }, 2000)
          return
        }

        const { type, userInput, response } = data
        setUserText("")
        setAiText(response)
        setStatus("Speaking...")

        await speak(response)

        setAiText("")
        setStatus("")

        const open = (url) => window.open(url, '_blank')
        if (type === 'google-search')                      open(`https://www.google.com/search?q=${encodeURIComponent(userInput)}`)
        if (type === 'calculator-open')                    open('https://www.google.com/search?q=calculator')
        if (type === 'instagram-open')                     open('https://www.instagram.com/')
        if (type === 'facebook-open')                      open('https://www.facebook.com/')
        if (type === 'weather-show')                       open('https://www.google.com/search?q=weather')
        if (type === 'youtube-search' || type === 'youtube-play') open(`https://www.youtube.com/results?search_query=${encodeURIComponent(userInput)}`)

      } catch (err) {
        console.error("❌ Error:", err)
        setStatus("Error — try again")
        setUserText("")
        setTimeout(() => { setStatus(""); startListening() }, 2000)
      }

      setTimeout(() => startListening(), 500)
    }

    return () => {
      isMountedRef.current = false
      try { rec.stop() } catch (_) {}
      window.speechSynthesis.cancel()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Start button — directly starts mic, no async before it ──────────────────
  const handleStart = () => {
    setStarted(true)
    // Tiny dummy utterance to unlock speechSynthesis in Chrome
    const unlock = new SpeechSynthesisUtterance(' ')
    unlock.volume = 0
    window.speechSynthesis.speak(unlock)
    // Start mic right away
    setTimeout(() => startListening(), 300)
  }

  return (
    <div className='w-full h-[100vh] bg-gradient-to-t from-[black] to-[#02023d] flex justify-center items-center flex-col gap-[15px] overflow-hidden'>

      <CgMenuRight className='lg:hidden text-white absolute top-[20px] right-[20px] w-[25px] h-[25px] cursor-pointer' onClick={() => setHam(true)} />

      {/* Mobile menu */}
      <div className={`absolute lg:hidden top-0 w-full h-full bg-[#00000070] backdrop-blur-lg p-[20px] flex flex-col gap-[20px] items-start transition-transform z-10 ${ham ? 'translate-x-0' : 'translate-x-full'}`}>
        <RxCross1 className='text-white absolute top-[20px] right-[20px] w-[25px] h-[25px] cursor-pointer' onClick={() => setHam(false)} />
        <button className='min-w-[150px] h-[60px] text-black font-semibold bg-white rounded-full cursor-pointer text-[19px]' onClick={handleLogOut}>Log Out</button>
        <button className='min-w-[150px] h-[60px] text-black font-semibold bg-white rounded-full cursor-pointer text-[19px] px-[20px]' onClick={() => navigate('/customize')}>Customize Assistant</button>
        <div className='w-full h-[2px] bg-gray-500'></div>
        <h1 className='text-white font-semibold text-[19px]'>History</h1>
        <div className='w-full flex-1 overflow-y-auto flex flex-col gap-[12px]'>
          {userData.history?.map((h, i) => <p key={i} className='text-gray-300 text-[16px] truncate'>{h}</p>)}
        </div>
      </div>

      {/* Desktop buttons */}
      <button className='min-w-[150px] h-[55px] text-black font-semibold absolute hidden lg:block top-[20px] right-[20px] bg-white rounded-full cursor-pointer text-[18px]' onClick={handleLogOut}>Log Out</button>
      <button className='min-w-[180px] h-[55px] text-black font-semibold bg-white absolute top-[90px] right-[20px] rounded-full cursor-pointer text-[17px] px-[20px] hidden lg:block' onClick={() => navigate('/customize')}>Customize Assistant</button>

      {/* Assistant image */}
      <div className='w-[280px] h-[370px] flex justify-center items-center overflow-hidden rounded-3xl shadow-lg shadow-blue-900'>
        <img src={userData?.assistantImage} alt="assistant" className='h-full object-cover' />
      </div>

      <h1 className='text-white text-[20px] font-semibold'>I'm {userData?.assistantName}</h1>

      {/* Start button */}
      {!started && (
        <button
          onClick={handleStart}
          className='mt-[10px] px-[40px] h-[55px] bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-bold rounded-full text-[18px] cursor-pointer transition-all shadow-lg shadow-blue-800'
        >
          🎙️ Start Assistant
        </button>
      )}

      {started && status && <p className='text-blue-300 text-[15px] animate-pulse'>{status}</p>}

      {started && (aiText
        ? <img src={aiImg}   alt="ai"   className='w-[180px]' />
        : <img src={userImg} alt="user" className='w-[180px]' />
      )}

      {started && (userText || aiText) && (
        <h1 className='text-white text-[17px] font-semibold text-center px-[30px] max-w-[600px]'>
          {userText || aiText}
        </h1>
      )}

    </div>
  )
}

export default Home