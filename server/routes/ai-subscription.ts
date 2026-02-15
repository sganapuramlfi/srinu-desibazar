import { Router } from 'express';
import { db } from '../../db/index.js';
import { aiSubscriptions } from '../../db/index.js';
import { eq } from 'drizzle-orm';

const router = Router();

// Subscribe user for AI feature notifications
router.post('/subscribe', async (req, res) => {
  try {
    const { email, features = [], notifyOnLaunch = true } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    // Check if user already subscribed
    const existing = await db
      .select()
      .from(aiSubscriptions)
      .where(eq(aiSubscriptions.email, email))
      .limit(1);

    if (existing.length > 0) {
      // Update existing subscription
      await db
        .update(aiSubscriptions)
        .set({
          features: JSON.stringify(features),
          notifyOnLaunch,
          updatedAt: new Date()
        })
        .where(eq(aiSubscriptions.email, email));
    } else {
      // Create new subscription
      await db.insert(aiSubscriptions).values({
        email,
        features: JSON.stringify(features),
        notifyOnLaunch,
        subscribed: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    res.json({ 
      success: true, 
      message: 'Successfully subscribed for AI feature updates!' 
    });

  } catch (error) {
    console.error('AI subscription error:', error);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

// Get subscription status
router.get('/subscription/:email', async (req, res) => {
  try {
    const { email } = req.params;

    const subscription = await db
      .select()
      .from(aiSubscriptions)
      .where(eq(aiSubscriptions.email, email))
      .limit(1);

    if (subscription.length === 0) {
      return res.json({ subscribed: false });
    }

    res.json({
      subscribed: subscription[0].subscribed,
      features: JSON.parse(subscription[0].features || '[]'),
      notifyOnLaunch: subscription[0].notifyOnLaunch
    });

  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

// Unsubscribe
router.post('/unsubscribe', async (req, res) => {
  try {
    const { email } = req.body;

    await db
      .update(aiSubscriptions)
      .set({
        subscribed: false,
        updatedAt: new Date()
      })
      .where(eq(aiSubscriptions.email, email));

    res.json({ success: true, message: 'Successfully unsubscribed' });

  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

// Admin: Get all subscribers (protected route)
router.get('/subscribers', async (req, res) => {
  try {
    // Add admin authentication check here
    
    const subscribers = await db
      .select({
        email: aiSubscriptions.email,
        features: aiSubscriptions.features,
        notifyOnLaunch: aiSubscriptions.notifyOnLaunch,
        createdAt: aiSubscriptions.createdAt
      })
      .from(aiSubscriptions)
      .where(eq(aiSubscriptions.subscribed, true));

    res.json({
      count: subscribers.length,
      subscribers: subscribers.map(sub => ({
        ...sub,
        features: JSON.parse(sub.features || '[]')
      }))
    });

  } catch (error) {
    console.error('Get subscribers error:', error);
    res.status(500).json({ error: 'Failed to get subscribers' });
  }
});

export default router;