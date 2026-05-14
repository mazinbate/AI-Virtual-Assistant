//import { v2 as cloudinary } from 'cloudinary';
//import fs from "fs"
//const uploadOnCloudinary =async (filePath)=>{
     //cloudinary.config({ 
        //cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
       // api_key: process.env.CLOUDINARY_API_KEY, 
     //   api_secret: process.env.CLOUDINARY_API_SECRET 
    //});

    //try {
        //const uploadResult = await cloudinary.uploader
       //.upload(filePath)
       //fs.unlinkSync(filePath)
      // return uploadResult.secure_url
    //} catch (error) {
    //fs.unlinkSync(filePath)
    //return res.status(500).json({message:"cloudinary error"})
  //  }
//}


//export default uploadOnCloudinary
import { v2 as cloudinary } from 'cloudinary'
import fs from "fs"

const uploadOnCloudinary = async (filePath) => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  })

  try {
    const uploadResult = await cloudinary.uploader.upload(filePath)
    fs.unlinkSync(filePath) // delete temp file after upload
    return uploadResult.secure_url
  } catch (error) {
    // ✅ FIX: old code had "return res.status(500)" here — res doesn't exist in this file!
  
    try { fs.unlinkSync(filePath) } catch (_) {}
    console.log("Cloudinary upload error:", error)
    throw new Error("Cloudinary upload failed: " + error.message)
  }
}

export default uploadOnCloudinary