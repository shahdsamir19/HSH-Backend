require("dotenv").config();

const env = process.env.NODE_ENV || "development";

const dbConfig = {
  development: {
    database: process.env.DB_NAME_DEV,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    dialect: "postgres",
    logging: console.log,
  },

  test: {
    database: process.env.DB_NAME_TEST,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    dialect: "postgres",
    logging: false,
  },

  production: {
    use_env_variable: "DATABASE_URL",
    dialect: "postgres",
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
};

module.exports = dbConfig;