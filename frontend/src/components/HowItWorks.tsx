import { motion } from 'framer-motion';

const steps = [
  {
    number: '1',
    title: 'Choose a city & theme',
    description: 'Enter any city and pick from 17 beautiful color themes.',
  },
  {
    number: '2',
    title: 'Pick a style',
    description: 'Adjust the map radius to capture the perfect area.',
  },
  {
    number: '3',
    title: 'Get it by email',
    description: 'We generate a high-res poster and send it straight to you.',
  },
];

export default function HowItWorks() {
  return (
    <section className="py-24 px-6 bg-[#F8F9FA]">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-[#0A0A0A] text-center mb-16">
          How it works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="text-center"
            >
              <div className="w-10 h-10 rounded-full bg-[#0A0A0A] text-white flex items-center justify-center text-sm font-bold mx-auto mb-4">
                {step.number}
              </div>
              <h3 className="font-semibold text-[#0A0A0A] mb-2">{step.title}</h3>
              <p className="text-sm text-[#6B7280]">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
