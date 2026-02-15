/**
 * Invoice Generation Service
 * Creates professional PDF invoices for subscriptions
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../../db/index.js';
import {
  subscriptionInvoices,
  businessSubscriptions,
  subscriptionPlans,
  businessTenants,
} from '../../db/index.js';
import { eq } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Invoice storage directory
const invoicesDir = path.join(__dirname, '../../invoices');
if (!fs.existsSync(invoicesDir)) {
  fs.mkdirSync(invoicesDir, { recursive: true });
}

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  businessName: string;
  businessEmail: string;
  businessAddress?: string;
  planName: string;
  subtotal: number;
  tax: number;
  total: number;
  lineItems: Array<{
    description: string;
    amount: number;
    quantity: number;
  }>;
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Generate invoice number
 */
export function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}${month}-${random}`;
}

/**
 * Calculate GST (10% for Australia)
 */
export function calculateGST(subtotal: number): number {
  return Math.round((subtotal * 0.10) * 100) / 100;
}

/**
 * Generate PDF invoice
 */
export async function generateInvoicePDF(invoiceData: InvoiceData): Promise<string> {
  const filename = `${invoiceData.invoiceNumber}.pdf`;
  const filepath = path.join(invoicesDir, filename);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // Header
      doc.fontSize(24).text('INVOICE', { align: 'right' });
      doc.moveDown();

      // Company Info
      doc.fontSize(20).text('DesiBazaar', 50, 50);
      doc.fontSize(10).text('ABN: 12 345 678 901', 50, 80);
      doc.text('Level 1, 123 Business Street', 50, 95);
      doc.text('Sydney, NSW 2000, Australia', 50, 110);
      doc.text('Email: billing@desibazaar.com.au', 50, 125);
      doc.text('Phone: 1300 DESI BAZ', 50, 140);

      // Invoice Details (Right side)
      doc.fontSize(10);
      doc.text(`Invoice #: ${invoiceData.invoiceNumber}`, 400, 80);
      doc.text(`Date: ${formatDate(invoiceData.invoiceDate)}`, 400, 95);
      doc.text(`Due Date: ${formatDate(invoiceData.dueDate)}`, 400, 110);

      // Bill To
      doc.fontSize(12).text('Bill To:', 50, 180);
      doc.fontSize(10);
      doc.text(invoiceData.businessName, 50, 200);
      doc.text(invoiceData.businessEmail, 50, 215);
      if (invoiceData.businessAddress) {
        doc.text(invoiceData.businessAddress, 50, 230);
      }

      // Service Period
      doc.fontSize(10).text(
        `Service Period: ${formatDate(invoiceData.periodStart)} - ${formatDate(invoiceData.periodEnd)}`,
        50,
        260
      );

      // Line Items Table
      const tableTop = 300;
      const descriptionX = 50;
      const quantityX = 350;
      const amountX = 450;

      // Table Header
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Description', descriptionX, tableTop);
      doc.text('Qty', quantityX, tableTop);
      doc.text('Amount', amountX, tableTop);

      // Draw header line
      doc
        .moveTo(50, tableTop + 15)
        .lineTo(545, tableTop + 15)
        .stroke();

      // Table Rows
      doc.font('Helvetica');
      let yPosition = tableTop + 25;
      invoiceData.lineItems.forEach((item) => {
        doc.text(item.description, descriptionX, yPosition);
        doc.text(item.quantity.toString(), quantityX, yPosition);
        doc.text(`$${item.amount.toFixed(2)}`, amountX, yPosition);
        yPosition += 25;
      });

      // Draw bottom line
      doc
        .moveTo(50, yPosition)
        .lineTo(545, yPosition)
        .stroke();

      // Totals
      yPosition += 15;
      doc.fontSize(10);
      doc.text('Subtotal:', 350, yPosition);
      doc.text(`$${invoiceData.subtotal.toFixed(2)}`, amountX, yPosition);

      yPosition += 20;
      doc.text('GST (10%):', 350, yPosition);
      doc.text(`$${invoiceData.tax.toFixed(2)}`, amountX, yPosition);

      yPosition += 20;
      doc.font('Helvetica-Bold').fontSize(12);
      doc.text('Total:', 350, yPosition);
      doc.text(`$${invoiceData.total.toFixed(2)}`, amountX, yPosition);

      // Payment Info
      yPosition += 50;
      doc.font('Helvetica').fontSize(10);
      doc.text('Payment Information:', 50, yPosition);
      yPosition += 20;
      doc.text('This invoice was automatically charged to your payment method on file.', 50, yPosition);
      yPosition += 15;
      doc.text('Thank you for your business!', 50, yPosition);

      // Footer
      const footerY = 750;
      doc.fontSize(8).text(
        'This is a computer-generated invoice and does not require a signature.',
        50,
        footerY,
        { align: 'center', width: 495 }
      );

      doc.end();

      stream.on('finish', () => {
        resolve(filepath);
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Create invoice for subscription payment
 */
export async function createInvoiceForSubscription(
  subscriptionId: number,
  stripeInvoiceId: string,
  amountPaid: number
): Promise<number> {
  // Get subscription details
  const [subscription] = await db
    .select({
      subscription: businessSubscriptions,
      plan: subscriptionPlans,
      business: businessTenants,
    })
    .from(businessSubscriptions)
    .innerJoin(
      subscriptionPlans,
      eq(businessSubscriptions.planId, subscriptionPlans.id)
    )
    .innerJoin(
      businessTenants,
      eq(businessSubscriptions.businessId, businessTenants.id)
    )
    .where(eq(businessSubscriptions.id, subscriptionId))
    .limit(1);

  if (!subscription) {
    throw new Error('Subscription not found');
  }

  // Calculate amounts
  const subtotal = amountPaid / 1.10; // Remove GST
  const tax = calculateGST(subtotal);
  const total = amountPaid;

  // Generate invoice number
  const invoiceNumber = generateInvoiceNumber();

  // Prepare invoice data
  const invoiceData: InvoiceData = {
    invoiceNumber,
    invoiceDate: new Date(),
    dueDate: new Date(), // Paid immediately
    businessName: subscription.business.name,
    businessEmail: subscription.subscription.billingEmail,
    planName: subscription.plan.name,
    subtotal,
    tax,
    total,
    lineItems: [
      {
        description: `${subscription.plan.name} Subscription`,
        amount: subtotal,
        quantity: 1,
      },
    ],
    periodStart: subscription.subscription.currentPeriodStart || new Date(),
    periodEnd: subscription.subscription.currentPeriodEnd || new Date(),
  };

  // Generate PDF
  const pdfPath = await generateInvoicePDF(invoiceData);

  // Store invoice in database
  const [invoice] = await db
    .insert(subscriptionInvoices)
    .values({
      subscriptionId: subscription.subscription.id,
      businessId: subscription.business.id,
      stripeInvoiceId,
      invoiceNumber,
      invoiceDate: new Date(),
      subtotal: subtotal.toString(),
      tax: tax.toString(),
      total: total.toString(),
      amountDue: '0', // Already paid
      amountPaid: total.toString(),
      amountRemaining: '0',
      status: 'paid',
      lineItems: invoiceData.lineItems,
      invoicePdfUrl: `/invoices/${path.basename(pdfPath)}`,
      paidAt: new Date(),
      periodStart: invoiceData.periodStart,
      periodEnd: invoiceData.periodEnd,
    })
    .returning();

  console.log(`✅ Invoice created: ${invoiceNumber} for subscription ${subscriptionId}`);

  return invoice.id;
}

/**
 * Get invoice PDF path
 */
export function getInvoicePath(invoiceNumber: string): string {
  return path.join(invoicesDir, `${invoiceNumber}.pdf`);
}

/**
 * Check if invoice PDF exists
 */
export function invoiceExists(invoiceNumber: string): boolean {
  return fs.existsSync(getInvoicePath(invoiceNumber));
}
