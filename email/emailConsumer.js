const amqp = require('amqplib');
const AWS = require('aws-sdk');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Debug environment variables
console.log('Environment variables:');
console.log('ALERT_FROM_EMAIL:', process.env.ALERT_FROM_EMAIL);
console.log('ALERT_TO_EMAIL:', process.env.ALERT_TO_EMAIL);
console.log('AWS_REGION:', process.env.AWS_REGION);

// Configure AWS SES
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-west-2'
});

const ses = new AWS.SES({ apiVersion: '2010-12-01' });

// Configure email transport
const transporter = nodemailer.createTransport({
  SES: ses,
  // Fallback to basic SMTP if needed
  /*
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || process.env.ALERT_FROM_EMAIL,
    pass: process.env.SMTP_PASS
  }
  */
});

// Hardcoded fallback values
const FROM_EMAIL = process.env.ALERT_FROM_EMAIL || 'sales@performancecorporate.com';
const TO_EMAIL = process.env.ALERT_TO_EMAIL || 'worker@citep.com';

async function startConsumer() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    
    connection.on('error', (err) => {
      console.error('RabbitMQ connection error:', err);
      setTimeout(startConsumer, 5000);
    });
    
    const channel = await connection.createChannel();
    await channel.assertQueue('email_notifications', { durable: true });
    
    console.log('Email consumer waiting for messages...');
    
    // Consume messages
    channel.consume('email_notifications', async (msg) => {
      if (msg !== null) {
        try {
          console.log('Received message:', msg.content.toString());
          const content = JSON.parse(msg.content.toString());
          
          if (content.type === 'contact_form') {
            console.log('Processing contact form with data:', JSON.stringify(content.data));
            
            // Create email content
            const mailOptions = {
              from: FROM_EMAIL,
              to: TO_EMAIL,
              subject: `New Contact Form: ${content.data.subject || 'Contact Request'}`,
              text: `
                Name: ${content.data.name || 'Not provided'}
                Email: ${content.data.email || 'Not provided'}
                Phone: ${content.data.phone || 'Not provided'}
                
                Message:
                ${content.data.message || 'No message content'}
              `,
              html: `
                <h2>New Contact Form Submission</h2>
                <p><strong>Name:</strong> ${content.data.name || 'Not provided'}</p>
                <p><strong>Email:</strong> ${content.data.email || 'Not provided'}</p>
                <p><strong>Phone:</strong> ${content.data.phone || 'Not provided'}</p>
                <h3>Message:</h3>
                <p>${content.data.message || 'No message content'}</p>
              `
            };
            
            console.log('Sending email with options:', JSON.stringify({
              from: mailOptions.from,
              to: mailOptions.to,
              subject: mailOptions.subject
            }));
            
            await transporter.sendMail(mailOptions);
            console.log('Email sent successfully');
          }
          
          // Acknowledge message
          channel.ack(msg);
          
        } catch (error) {
          console.error('Error processing message:', error);
          // Acknowledge the message to prevent endless retries
          channel.ack(msg);
        }
      }
    });
  } catch (error) {
    console.error('Consumer error:', error);
    setTimeout(startConsumer, 5000);
  }
}

// Start the consumer
startConsumer();
