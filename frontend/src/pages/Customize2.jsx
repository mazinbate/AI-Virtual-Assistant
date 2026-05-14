import React, { useContext, useState } from 'react'
import { userDataContext } from '../context/UserContext'
import axios from 'axios'
import { MdKeyboardBackspace } from "react-icons/md"
import { useNavigate } from 'react-router-dom'

function Customize2() {
  const { userData, backendImage, selectedImage, serverUrl, setUserData } = useContext(userDataContext)
  const [assistantName, setAssistantName] = useState(userData?.assistantName || "")
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState("")
  const navigate = useNavigate()

  const handleUpdateAssistant = async () => {
    if (!assistantName.trim()) return
    setLoading(true)
    setErr("")

    try {
      const formData = new FormData()
      formData.append("assistantName", assistantName.trim())

      if (backendImage) {
        // User picked their own photo — send as file for Cloudinary upload
        formData.append("assistantImage", backendImage)
      } else {
        // User picked a preset image — selectedImage is a local Vite path
        // Send it as imageUrl string so backend just saves it directly (no Cloudinary)
        formData.append("imageUrl", selectedImage)
      }

      const result = await axios.post(
        `${serverUrl}/api/user/update`,
        formData,
        { withCredentials: true }
      )

      console.log("Updated:", result.data)
      setUserData(result.data)
      setLoading(false)
      navigate("/")
    } catch (error) {
      setLoading(false)
      console.log("Update error:", error)
      setErr("Something went wrong. Check your backend terminal.")
    }
  }

  return (
    <div className='w-full h-[100vh] bg-gradient-to-t from-[black] to-[#030353] flex justify-center items-center flex-col p-[20px] relative'>
      <MdKeyboardBackspace
        className='absolute top-[30px] left-[30px] text-white cursor-pointer w-[25px] h-[25px]'
        onClick={() => navigate("/customize")}
      />
      <h1 className='text-white mb-[40px] text-[30px] text-center'>
        Enter Your <span className='text-blue-200'>Assistant Name</span>
      </h1>
      <input
        type="text"
        placeholder='eg. jarvis'
        className='w-full max-w-[600px] h-[60px] outline-none border-2 border-white bg-transparent text-white placeholder-gray-300 px-[20px] py-[10px] rounded-full text-[18px]'
        onChange={(e) => setAssistantName(e.target.value)}
        value={assistantName}
      />
      {err && <p className='text-red-400 mt-[15px] text-[16px]'>*{err}</p>}
      {assistantName && (
        <button
          className='min-w-[300px] h-[60px] mt-[30px] text-black font-semibold cursor-pointer bg-white rounded-full text-[19px] disabled:opacity-50'
          disabled={loading}
          onClick={handleUpdateAssistant}
        >
          {loading ? "Saving..." : "Create Your Assistant"}
        </button>
      )}
    </div>
  )
}

export default Customize2