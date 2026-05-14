import uploadOnCloudinary from "../config/cloudinary.js"
import geminiResponse from "../gemini.js"
import User from "../models/user.model.js"
import moment from "moment"

export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password")
    if (!user) return res.status(400).json({ message: "User not found" })

    return res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      assistantName: user.assistantName,
      assistantImage: user.assistantImage,
      history: user.history
    })
  } catch (error) {
    console.log("getCurrentUser error:", error)
    return res.status(500).json({ message: "Get current user error" })
  }
}

export const updateAssistant = async (req, res) => {
  try {
    const { assistantName, imageUrl } = req.body
    console.log("updateAssistant called")
    console.log("assistantName:", assistantName)
    console.log("imageUrl:", imageUrl)
    console.log("req.file:", req.file)

    let assistantImage

    if (req.file) {
      // User uploaded their own photo — upload to Cloudinary
      console.log("Uploading to Cloudinary...")
      assistantImage = await uploadOnCloudinary(req.file.path)
      console.log("Cloudinary URL:", assistantImage)
    } else if (imageUrl) {
      // Preset image — just save the path string directly, no Cloudinary needed
      assistantImage = imageUrl
      console.log("Using preset imageUrl:", assistantImage)
    } else {
      return res.status(400).json({ message: "No image provided" })
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { assistantName, assistantImage },
      { new: true }
    ).select("-password")

    if (!user) return res.status(400).json({ message: "User not found" })

    return res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      assistantName: user.assistantName,
      assistantImage: user.assistantImage,
      history: user.history
    })
  } catch (error) {
    console.log("updateAssistant error:", error)
    return res.status(500).json({ message: `Update assistant error: ${error.message}` })
  }
}

export const askToAssistant = async (req, res) => {
  try {
    const { command } = req.body
    const user = await User.findById(req.userId)
    if (!user) return res.status(400).json({ message: "User not found" })

    user.history.push(command)
    await user.save()

    const result = await geminiResponse(command, user.assistantName, user.name)
    console.log("Raw Gemini result:", result)

    const jsonMatch = result.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return res.json({ type: "general", userInput: command, response: "Sorry, I didn't understand that." })
    }

    const gemResult = JSON.parse(jsonMatch[0])
    console.log("Parsed Gemini result:", gemResult)
    const type = gemResult.type

    switch (type) {
      case 'get-date':
        return res.json({ type, userInput: gemResult.userInput, response: `Today's date is ${moment().format("MMMM Do, YYYY")}` })
      case 'get-time':
        return res.json({ type, userInput: gemResult.userInput, response: `The current time is ${moment().format("hh:mm A")}` })
      case 'get-day':
        return res.json({ type, userInput: gemResult.userInput, response: `Today is ${moment().format("dddd")}` })
      case 'get-month':
        return res.json({ type, userInput: gemResult.userInput, response: `The current month is ${moment().format("MMMM")}` })
      case 'google-search':
      case 'youtube-search':
      case 'youtube-play':
      case 'general':
      case 'calculator-open':
      case 'instagram-open':
      case 'facebook-open':
      case 'weather-show':
        return res.json({ type, userInput: gemResult.userInput, response: gemResult.response })
      default:
        return res.json({ type: "general", userInput: command, response: "I didn't understand that command." })
    }
  } catch (error) {
    console.log("askToAssistant error:", error)
    return res.status(500).json({ type: "general", userInput: "", response: "Something went wrong." })
  }
}