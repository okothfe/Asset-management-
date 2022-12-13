let AsyncError = require("./../utils/catchAsync");
let userModel = require("./../models/userModel");

let JWT = require("jsonwebtoken");
let Email = require("./../utils/email");
let util = require("util");
let appError = require("./../utils/classError");
let crypto = require("crypto");

function generateToken(user) {
  return JWT.sign({ id: user._id, cpa: "Techkey" }, process.env.TOKENSECRETE, {
    expiresIn: process.env.TOKENDURATION,
  });
}
function generateCookie(res, token, req) {
  let options = {
    expires: new Date(Date.now() + process.env.COOKIEDURATION + 24 + 60 + 60),
    //secure: process.env.NODE_ENV == 'production' ? true : false,
    secure: req.secure || req.headers["x-forwarded-proto"] === "https",
    httpOnly: true,
  };
  res.cookie("JWT", token, options);
}

exports.login = AsyncError(async function (req, res, next) {
  let { email, password } = { ...req.body };
  if (!email || !password) {
    return res.json({
      status: "failed",
      message: "Both Email and password must be set",
    });
  }
  let user = await userModel.findOne({ email: email }).select("+password");

  if (!user) {
    return res.json({
      status: "failed",
      message: "Email or password is invalid",
    });
  }
  if (!user.isVerified) {
    let id = user.id;
    return res.status(200).json({
      status: "success",
      id,
      tag: "verify",
      message: "your account is not verified",
    });
  }

  if (user.msuid != req.body.msuid) {
    return res.json({
      status: "failed",
      message: "University ID is invalid",
    });
  }

  let correct = await user.correctPassword(user.password, password);
  if (correct) {
    let token = generateToken(user);

    // res.locals.user = user;
    res.status(200).json({
      status: "success",
      message: "Login Success",
      token,
      user: {
        name: user.name,
        phone: user.phone,
        role: user.role,
        photo: user.photo,
        email: user.email,
      },
    });
  } else {
    return res.json({
      status: "failed",
      message: "Email or password is invalid",
    });
  }

  //
});

exports.protected = AsyncError(async function (req, res, next) {
  //get the token
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.JWT) {
    token = req.cookies.JWT;
  }
  if (!token && req.body.token) {
    token = req.body.token;
  }
  //validate token

  if (!token) {
    return res.json({
      status: "failed",
      message: "You are not logged in, please login to access the resource ",
    });
  }
  //processing the promise using node util class
  //   let tokenValid;
  //   await JWT.verify(token, process.env.TOKENSECRETE, function (token) { tokenValid = token; });
  let tokenValid = await util.promisify(JWT.verify)(
    token,
    process.env.TOKENSECRETE
  );

  //check user if exists
  //let user = await Model.find({ _id: tokenValid.id });
  let user = await userModel.findById(tokenValid.id);

  if (!user) {
    return next(new appError("No user assigned to the token", 401));
  }

  if (user.haschangedPassword(tokenValid.iat)) {
    return next(new appError("User recently changed the password", 401));
  }

  //if user changed password after token was issued
  //continue to send tours
  req.user = user;
  next();
});

//logged in user
exports.isLoggedin = async function (req, res, next) {
  //get the token
  try {
    if (req.cookies.JWT) {
      let tokenValid = await util.promisify(JWT.verify)(
        req.cookies.JWT,
        process.env.TOKENSECRETE
      );

      let user = await userModel.findById(tokenValid.id);

      if (!user) {
        return next();
      }
      if (user.haschangedPassword(tokenValid.iat)) {
        return next();
      }
      res.locals.user = user;
    }
    next();
  } catch (err) {
    next();
  }
};

//Validate user token
exports.validateUserToken = async function (req, res, next) {
  //get the token
  try {
    let token = req.body.token;

    if (token) {
      let tokenValid = await util.promisify(JWT.verify)(
        token,
        process.env.TOKENSECRETE
      );

      let user = await userModel.findById(tokenValid.id);

      if (!user) {
        return res.json({
          status: "failed",
          message: "user not found",
        });
      }
      if (user.haschangedPassword(tokenValid.id)) {
        return res.json({
          status: "failed",
          message: "password has changed",
        });
      }

      if (user) {
        if (user.email == "info@techkey.co.ke") {
          return res.json({
            status: "verifiedAlready",
            token,
          });
        }

        return res.json({
          status: "success",
          token,
          user: {
            id: user._id,
            name: user.name,
            phone: user.phone,
            role: user.role,
            photo: user.photo,
            email: user.email,
            msuid: user.msuid,
          },
          message: "User Data Loaded",
        });
      }
    }

    res.json({
      status: "failed No Token",
    });
  } catch (err) {
    console.log("TC-7867", err);
    res.json({
      status: "failed",
      message: "Failed to login",
    });
  }
};

exports.forgotPassword = AsyncError(async function (req, res, next) {
  let user = await userModel.findOne({ email: req.body.email });

  if (!user) {
    return res.json({
      status: "failed  ",
      message: "Email not registered",
    });
  }
  let token = user.createResetPasswordtoken();

  await user.save({ validateBeforeSave: false });

  // let resetUrl = `Use this link to reset your password \n You need a
  // new password and confirm password ${req.protocol}://${req.get('host')}/api/v1/users/resetpassword/${token}.`;

  let resetUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/users/resetpassword/${token}.`;

  try {
    new Email(user, resetUrl).sendResetPassword();
    /*
      await sendEmail({
        receiver: user.email,
        subject: 'Password reset link, valid 10 min',
        text: resetUrl,
      });*/
    res.status(200).json({
      status: "success",
      token,
      message: `email sent To ${user.email}`,
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return res.json({
      status: "failed",
      message: "There was an error sending the email try again later",
    });
  }
});

exports.resetPassword = AsyncError(async function (req, res, next) {
  let user;
  let hashed = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");
  let userData = await userModel.findOne({
    passwordResetToken: hashed,
  });

  user = userData;

  if (!user) {
    return next(new appError("Invalid Token", 500));
  }
  let currentTime = new Date();
  let expireDate = user.passwordResetExpire;

  if (!currentTime > expireDate) {
    return next(
      new appError("Sorry Reset link Expired, generate a new link  ", 401)
    );
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpire = undefined;

  await user.save();
  let token = await generateToken(user);
  generateCookie(res, token, req);

  res.status(200).json({ function: "success", token });
});

exports.updatepassword = AsyncError(async function (req, res, next) {
  let currentPassword = req.body.currentPassword;
  if (!currentPassword) {
    return next(new appError("Current Password is not set", 401));
  }
  let user = await userModel
    .findOne({ email: req.user.email })
    .select("+password");

  let correct = await user.correctPassword(user.password, currentPassword);

  if (correct) {
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();
    let token = generateToken(user);
    generateCookie(res, token, req);
    res.status(200).json({
      status: "success",
      token,
    });
  } else {
    return next(new appError("Current Password is incorrect", 401));
  }
});

exports.logout = function (req, res, next) {
  res.cookie("JWT", "logged out", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.json({
    status: "success",
    message: "logged out",
  });

  res.json({
    status: "success",
    message: "logged out",
  });
};
