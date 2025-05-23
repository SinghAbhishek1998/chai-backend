import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async(userId) =>
{
    try{
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave:false})
        // await user.updateOne({refreshToken: refreshToken})
        return {accessToken, refreshToken}
    }catch(err){
        throw new ApiError(500,"Something went wrong while generating refresh and access token")
    }
}


const registerUser =  asyncHandler(async (req,res)=>{
    const {email, username,password, fullName} = req.body;
    if([email,username,password,fullName].some((field)=> field?.trim()==="")){
        throw new ApiError(400,"All fields are required!")
    }
    const existedUser = await User.findOne({
        $or:[{username}, {email}]
    })
    if (existedUser) throw new ApiError(409,"User already exists")
    
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!avatar){
        throw new ApiError(400,"Avatar file is missing")
    }
    const user = await User.create({
        fullName:fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()

    })
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new ApiError(500,"Something went wrong with user registration!!")
    }
    return res.status(201).json(new ApiResponse(200,"User Registered Successfully",createdUser))
})

const loginUser = asyncHandler(async (req,res)=>{
    const {email, username, password} = req.body
        if(!(email || password)){
            throw new ApiError(400, "Username or password is required")
        }
        const user =  await User.findOne({
            $or:[{username},{email}]
        })

        if(!user){
            throw new ApiError(404,"User does not exists")
        }
        const isPasswordValid = await user.isPasswordCorrect(password)
        if(!isPasswordValid){
            throw new ApiError(401,"Invalid User credentials")
        }

        // get refresh and access tokens
        const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)
        const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

        const options = { 
            // now cookie can't be modified through frontend so only it can be modified through backend
            httpOnly: true,
            secure: true
        }
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200,{
                user: loggedInUser, accessToken, refreshToken
            },"User logged In successfully")
        )
    })

const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(req.user._id,{
        $set:{
            refreshToken:undefined
        }
    },{
        new:true
    })

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged out successfully!"))
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized request")
    }
    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id)
        if(!user){
           throw new ApiError(401,"Invalid Refresh Token") 
        }
        if(incomingRefreshToken != user?.refreshToken){
            throw new ApiError(401,"Refresh Token is expired or used")
        }
    
        const options = {
            httpOnly:true,
            secure:true
    
        }
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200,
                {accessToken, refreshToken: newRefreshToken},"Access Token Refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

export {registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}