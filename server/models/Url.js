const mongoose = require("mongoose");

const urlSchema = new mongoose.Schema({
    originalUrl : {
        type : String,
        required : true
    },
    shortCode : {
        type : String,
        required : true,
        unique : true
    },
    domain :{
        type : String,
        required : true
    },
    clicks : {
        type : Number,
        default : 0
    },
    expiresAt: {
        type: Date,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    }
    },
    {
    timestamps: true
    }
);

urlSchema.index({ userId: 1, createdAt: -1 });

const url = mongoose.model("URLS",urlSchema);

module.exports = url ;