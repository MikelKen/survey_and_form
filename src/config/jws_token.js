import jwt from "jsonwebtoken";

export const JWT_SECRET = process.env.JWT_SECRET;
export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "8h" }, // Expiración configurable
  );
};
