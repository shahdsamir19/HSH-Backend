'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'resetPasswordOtp', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('users', 'resetPasswordOtpExpiresAt', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'resetPasswordOtp');
    await queryInterface.removeColumn('users', 'resetPasswordOtpExpiresAt');
  }
};