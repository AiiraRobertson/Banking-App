const express = require('express');
const { body } = require('express-validator');
const { handleValidation } = require('../middleware/validate');

const router = express.Router();

router.post('/loan', [
  body('principal').isFloat({ min: 1000, max: 10000000 }).withMessage('Loan amount must be between $1,000 and $10,000,000'),
  body('annual_rate').isFloat({ min: 0.1, max: 30 }).withMessage('Interest rate must be between 0.1% and 30%'),
  body('term_months').isInt({ min: 1, max: 360 }).withMessage('Term must be between 1 and 360 months'),
  handleValidation
], (req, res) => {
  const { principal, annual_rate, term_months } = req.body;

  const monthlyRate = annual_rate / 12 / 100;
  const n = term_months;

  let monthlyPayment;
  if (monthlyRate === 0) {
    monthlyPayment = principal / n;
  } else {
    monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
  }

  monthlyPayment = Math.round(monthlyPayment * 100) / 100;
  const totalPayment = Math.round(monthlyPayment * n * 100) / 100;
  const totalInterest = Math.round((totalPayment - principal) * 100) / 100;

  const schedule = [];
  let balance = principal;
  for (let month = 1; month <= n; month++) {
    const interestPayment = Math.round(balance * monthlyRate * 100) / 100;
    const principalPayment = Math.round((monthlyPayment - interestPayment) * 100) / 100;
    balance = Math.round((balance - principalPayment) * 100) / 100;
    if (balance < 0) balance = 0;

    schedule.push({
      month,
      payment: monthlyPayment,
      principal: principalPayment,
      interest: interestPayment,
      balance
    });
  }

  res.json({
    monthlyPayment,
    totalPayment,
    totalInterest,
    principal,
    annual_rate,
    term_months,
    schedule
  });
});

module.exports = router;
