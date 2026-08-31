const success = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const created = (res, data, message = 'Resource created successfully') => {
  return success(res, data, message, 201);
};

const paginated = (res, { docs, total, page, limit }, message = 'Success') => {
  return res.status(200).json({
    success: true,
    message,
    data: docs,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
};

module.exports = { success, created, paginated };
