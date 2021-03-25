exports.createResponse = (res, data, message = 'OK', status = 200, success = true) => {
  res.status(status);
  console.log(data);
  return {
    success,
    status,
    message,
    data,
  };
};
