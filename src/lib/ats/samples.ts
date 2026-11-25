export interface SampleJd { key: string; title: string; text: string }

export const SAMPLE_JDS: SampleJd[] = [
  {
    key: 'backend', title: 'Backend Engineer (Node.js / AWS)',
    text: `Backend Engineer, Payments Platform

We are looking for a Backend Engineer to design and build scalable microservices for our payments platform.

Responsibilities
- Design, build and operate REST APIs and event-driven microservices in Node.js and TypeScript
- Own services end to end on AWS (Lambda, ECS, S3, DynamoDB) using Terraform (infrastructure as code)
- Improve reliability and performance: caching with Redis, observability with Prometheus and Grafana
- Work with Kafka for event streaming and PostgreSQL for transactional data
- Write unit tests and integration tests; participate in code reviews; set up CI/CD with GitHub Actions
- Mentor junior engineers and collaborate cross-functional with product and design

Requirements
- 3+ years of backend development experience with Node.js, TypeScript or Python
- Strong system design and distributed systems fundamentals
- Experience with Docker and Kubernetes
- Experience with SQL databases (PostgreSQL / MySQL)
- Bachelor's degree in Computer Science or equivalent
- Nice to have: Go, gRPC, payments or fintech experience`,
  },
  {
    key: 'firmware', title: 'Embedded / IoT Firmware Engineer',
    text: `Embedded Firmware Engineer, IoT Devices

You will develop firmware for battery-powered IoT sensor devices.

What you'll do
- Develop and debug firmware in C and C++ on ARM Cortex-M microcontrollers (STM32, ESP32)
- Build on FreeRTOS or Zephyr RTOS; write device drivers for I2C, SPI and UART sensors
- Implement BLE and Wi-Fi connectivity, MQTT messaging to the cloud, and secure OTA updates
- Optimise low power consumption and power management for multi-year battery life
- Bring up new hardware with the electronics team using oscilloscope, logic analyzer and JTAG
- Write unit tests and automate firmware builds with CI/CD

You have
- Bachelor's in Electronics, Electrical Engineering or Computer Science
- 2+ years of embedded systems experience with RTOS and bare-metal firmware
- Understanding of interrupts, DMA, bootloader design and real-time constraints
- Python for test scripts; Git; Linux
- Strong problem solving and communication skills`,
  },
  {
    key: 'designer', title: 'Product Designer (UI/UX)',
    text: `Product Designer

We're hiring a Product Designer to own end-to-end design for our consumer mobile app.

You will
- Lead user research and usability testing to uncover customer needs
- Create user flows, wireframes, high-fidelity prototypes and visual design in Figma
- Contribute to and maintain our design system with accessibility (WCAG) in mind
- Partner with product management and engineering through the full product lifecycle
- Use data (Mixpanel, A/B testing) to measure the impact of design decisions
- Present design decisions to stakeholders with clear storytelling

About you
- 3+ years of product design experience (UX/UI) for web and mobile
- A portfolio showing interaction design, information architecture and responsive design
- Strong communication, collaboration and attention to detail
- Bonus: prototyping in Framer, basic HTML/CSS, motion design`,
  },
  {
    key: 'analyst', title: 'Data Analyst',
    text: `Data Analyst, Growth

Join our analytics team to turn data into decisions.

Responsibilities
- Write complex SQL queries to extract and analyse data from BigQuery / Snowflake
- Build dashboards and reporting in Tableau or Power BI for business stakeholders
- Define and track KPIs; run A/B testing and hypothesis testing for product experiments
- Perform data analysis and statistical analysis in Python (pandas, NumPy) or Excel
- Build and maintain ETL data pipelines with dbt and Airflow
- Present insights and recommendations to leadership with data visualization and storytelling

Requirements
- 1-3 years of data analytics experience
- Strong SQL and Excel skills; Python preferred
- Knowledge of statistics, regression and forecasting
- Bachelor's degree in Statistics, Economics, Computer Science or related field
- Excellent communication and stakeholder management`,
  },
];
