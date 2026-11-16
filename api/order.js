// Vercel Serverless Function - কাস্টমারের অর্ডার সরাসরি WooCommerce ব্যাকএন্ডে পাঠানোর জন্য
export default async function handler(req, res) {
    // CORS হেডার সেট করা
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'শুধুমাত্র POST রিকোয়েস্ট গ্রহণযোগ্য' });
    }

    // Vercel Environment Variables থেকে আপনার গোপন API Key নেওয়া হচ্ছে
    const consumerKey = process.env.WC_CONSUMER_KEY;
    const consumerSecret = process.env.WC_CONSUMER_SECRET;

    if (!consumerKey || !consumerSecret) {
        return res.status(500).json({ 
            success: false, 
            message: 'Vercel-এ WC_CONSUMER_KEY অথবা WC_CONSUMER_SECRET সেট করা হয়নি।' 
        });
    }

    // req.body স্ট্রিং আকারে আসলে নিরাপদে JSON-এ রূপান্তর করা
    let bodyData = {};
    try {
        bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    } catch (e) {
        return res.status(400).json({ success: false, message: 'ইনভ্যালিড রিকোয়েস্ট বডি ফরম্যাট।' });
    }

    const { name, phone, address, productId } = bodyData;

    if (!name || !phone || !address || !productId) {
        return res.status(400).json({
            success: false,
            message: 'সবগুলো তথ্য (নাম, ফোন, ঠিকানা ও প্রোডাক্ট আইডি) সঠিকভাবে পাওয়া যায়নি।'
        });
    }

    // WooCommerce REST API v3 অর্ডার ফরম্যাট
    const orderData = {
        payment_method: 'cod',
        payment_method_title: 'Cash on Delivery',
        set_paid: false,
        billing: {
            first_name: name,
            address_1: address,
            phone: phone,
            country: 'BD'
        },
        shipping: {
            first_name: name,
            address_1: address,
            country: 'BD'
        },
        line_items: [
            {
                product_id: productId,
                quantity: 1
            }
        ]
    };

    try {
        // Query parameters হিসেবে Consumer Key ও Secret পাঠানো (যাতে সার্ভার Authorization হেডার ব্লক না করে)
        const targetUrl = `https://myportshow.xo.je/wp-json/wc/v3/orders?consumer_key=${encodeURIComponent(consumerKey)}&consumer_secret=${encodeURIComponent(consumerSecret)}`;

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://myportshow.xo.je/'
            },
            body: JSON.stringify(orderData)
        });

        // সার্ভার JSON-এর বদলে HTML (যেমন বট প্রোটেকশন পেজ) পাঠালে তা নিরাপদে চেক করা
        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            return res.status(502).json({
                success: false,
                message: 'সার্ভার থেকে সঠিক JSON রেসপন্স আসেনি (সম্ভবত InfinityFree বট প্রোটেকশন বা সার্ভার এরর)।'
            });
        }

        if (!response.ok) {
            throw new Error(data.message || 'উকমার্সে অর্ডার সেভ হতে সমস্যা হয়েছে');
        }

        return res.status(200).json({ success: true, orderId: data.id });

    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
}