let AsyncError = require("../utils/catchAsync");
let model = require("../models/maintainPeriodModel");

exports.create = AsyncError(async function (req, res, next) {
  let doc = await model.create(req.body);
  res.json({
    status: "success",
    data: doc,
  });
});
exports.read = AsyncError(async function (req, res, next) {
  let data = await model.find();

  res.json({
    status: "success",
    total: data.length,
    data: data,
  });
});
exports.update = AsyncError(async function (req, res, next) {
  let id = req.params.id;

  let doc = await model.findOneAndUpdate({ _id: id }, req.body);
  res.json({
    status: "success",
    data: doc,
  });
});
exports.delete = AsyncError(async function (req, res, next) {
  let id = req.params.id;

  let doc = await model.findByIdAndDelete(id);
  res.json({
    status: "success",
  });
});
