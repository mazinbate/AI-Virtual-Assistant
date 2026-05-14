import genToken from "../config/token.js"
import User from "../models/user.model.js"
import bcrypt from "bcryptjs"

export const signUp = async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required!" })
    }

    const existEmail = await User.findOne({ email })
    if (existEmail) {
      return res.status(400).json({ message: "Email already exists!" })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters!" })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await User.create({
      name,
      email,
      password: hashedPassword
    })

    const token = await genToken(user._id)

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "strict",
      secure: false
    })

    // ✅ FIX: Never send password back to frontend
    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      assistantName: user.assistantName,
      assistantImage: user.assistantImage,
      history: user.history
    }

    return res.status(201).json(safeUser)

  } catch (error) {
    console.log("SignUp Error:", error)
    return res.status(500).json({ message: `Sign up error: ${error.message}` })
  }
}

export const Login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required!" })
    }

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ message: "Email does not exist!" })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect password!" })
    }

    const token = await genToken(user._id)

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "strict",
      secure: false
    })

    // ✅ FIX: Never send password back to frontend
    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      assistantName: user.assistantName,
      assistantImage: user.assistantImage,
      history: user.history
    }

    return res.status(200).json(safeUser)

  } catch (error) {
    console.log("Login Error:", error)
    return res.status(500).json({ message: `Login error: ${error.message}` })
  }
}

export const logOut = async (req, res) => {
  try {
    res.clearCookie("token")
    return res.status(200).json({ message: "Logged out successfully" })
  } catch (error) {
    console.log("LogOut Error:", error)
    return res.status(500).json({ message: `Logout error: ${error.message}` })
  }
}