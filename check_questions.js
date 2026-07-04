import sequelize from './src/config/database.js';
import Question from './src/models/Question.model.js';
(async () => {
  try {
    await sequelize.authenticate();
    const count = await Question.count();
    console.log('Total questions in DB:', count);
    if (count > 0) {
      const qs = await Question.findAll({ limit: 5 });
      console.log(qs.map(q => q.questionText));
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
})();
