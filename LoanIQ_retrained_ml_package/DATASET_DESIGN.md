# Dataset design notes

## Acceptance datasets

Each category has 1,200 application rows: 300 per product. The four datasets have common applicant, affordability, credit, requested amount, product threshold, and eligibility fields, plus category-specific fields:

- Car: vehicle price, down payment, vehicle condition, vehicle type.
- Home: property value, down payment, property type, city tier.
- Education: course cost, course level, study destination, collateral availability.
- Personal: loan purpose, co-applicant indicator.

`loan_approved` is generated using a probabilistic logistic score with a product-specific intercept and effects for credit score, monthly income, debt burden, requested principal relative to income, employment, bank balance, experience, hard eligibility and category-specific factors. Product intercepts deliberately differ, so the product approval-rate distributions vary. The label is not a simple copy of the eligibility flag.

## 16 products

Four fictional products per category. Product rules include min/max principal, minimum credit score, age limits, indicative interest rate and maximum tenure. See `data/products/loan_products.csv`.

## Applicants and existing loans

100 fictional applicant records with unique PAN-like identifiers and 135 active loan accounts. Applicant master loan counts and total EMIs reconcile to the loan-level file. PAN-like values are placeholders and are not valid identity credentials.

## Caveat

All data-generation rules, distributions, product details and outcomes are synthetic assumptions. These files are intended for software development, ML coursework, and demonstrations only.
