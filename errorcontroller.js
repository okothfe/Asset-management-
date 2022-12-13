let appError = require("./../utils/classError");

function developmentError(res, err, next) {
  let status = err.statusCode || 500;
  let message = err.message || "An error occured in middleware";
  if (status == 404) {
    message = "Page Not found";
    // res.status(status).render("404", {
    //   title: "Page Not found",
    // });
    res.json({
      status: "failed customly",
      message: message,
    });
  } else {
    // res.status(status).render("error", {
    //   title: "something is wrong",
    //   message,
    // });
    res.json({
      status: "failed customly",
      message,
      S: "---------------------------------------------------",
      stack: err.stack,
      error: err,
    });
  }
}

//having 4 parameters enable is to be registerd as an error handler
module.exports = function (err, req, res, next) {
  if (process.env.NODE_ENV == "development") {
    developmentError(res, err);
  } else if (process.env.NODE_ENV == "production") {
    //identifying mongo database errors
    let errors = { ...err };
    // CastError ivalid urls id
    if (err.name == "CastError") {
      errors = databaseError(errors);
    }
    // duplicate key data
    if (err.code == 11000) {
      errors = duplicateError(errors);
    }
    //Only enum values can be used
    if (err.name == "ValidationError") {
      errors = validationError(errors);
    }
    productionError(res, errors);
  }
};

function databaseError(err) {
  let message = `You have an invalid Value ${err.value} for ${err.path}  `;
  return new appError(message, 500);
}
function duplicateError(err) {
  let message = `The name  ${err.keyValue.name} is Already taken   `;
  return new appError(message, 500);
}
function validationError(err) {
  let errors = Object.values(err.errors).map((el) => el.message);

  let message = `Invalid input data ${errors} `;
  return new appError(message, 500);
}

function productionError(res, err) {
  let status = err.statusCode || 500;
  let message = err.message || "An error occured in middleware";

  if (err.isOperational) {
    res.json({
      status: "failed",
      message: message,
    });
  } else {
    res.json({
      status: "error",
      message: "Something went wrong",
      err,
    });
  }
}
