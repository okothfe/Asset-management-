let AsyncError = require("./../utils/catchAsync");
let model = require("./../models/computerModel");
let serverModel = require("./../models/serverModel");
let decomision = require("./../models/decomisionedModel");
let policyModel = require("./../models/policyModel");
const logActivity = require("../utils/loger");
const Email = require("../utils/email");

exports.create = AsyncError(async function (req, res, next) {
  let policy = await policyModel.findOne({
    name: "Install",
  });
  let doc = await model.create(req.body);
  new Email(policy.informants).sendNotification("Install", doc);

  res.json({
    status: "success",
    data: doc,
  });
});
exports.read = AsyncError(async function (req, res, next) {
  let computers = await model.find();

  res.json({
    status: "success",
    total: computers.length,
    data: computers,
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
  let obj = await model.findOne({ _id: id });

  if (!obj) {
    return res.json({
      status: "failed",
      message: "item to delete was not found",
    });
  }

  await decomision.create({
    name: obj.name,
    type: "computer",
    serial: obj.serialNumber,
  });

  logActivity(
    `A user by the email ${req.user.email} deleted a computer with the id ${id}`
  );

  await model.findByIdAndDelete(id);
  res.json({
    status: "success",
  });
});

exports.createserver = AsyncError(async function (req, res, next) {
  let doc = await serverModel.create(req.body);
  res.json({
    status: "success",
    data: doc,
  });
});
exports.readserver = AsyncError(async function (req, res, next) {
  let computers = await serverModel.find();

  res.json({
    status: "success",
    total: computers.length,
    data: computers,
  });
});
exports.updateserver = AsyncError(async function (req, res, next) {
  let id = req.params.id;

  let doc = await serverModel.findOneAndUpdate({ _id: id }, req.body);
  res.json({
    status: "success",
    data: doc,
  });
});
exports.deleteserver = AsyncError(async function (req, res, next) {
  let id = req.params.id;
  let obj = await serverModel.findOne({ _id: id });

  if (!obj) {
    return res.json({
      status: "failed",
      message: "item to delete was not found",
    });
  }

  await decomision.create({
    name: obj.name,
    type: "computer",
    serial: obj.serialNumber,
  });

  logActivity(
    `A user by the email ${req.user.email} deleted a computer with the id ${id}`
  );

  await serverModel.findByIdAndDelete(id);
  res.json({
    status: "success",
  });
});
