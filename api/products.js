// Vercel Serverless Function (Proxy) - InfinityFree API রিকোয়েস্ট হ্যান্ডেল করার জন্য
export default async function handler(req, res) {
    // CORS হেডার সেট করা যাতে ব্রাউজার কোনো বাধা না দেয়
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const targetUrl = 'https://myportshow.xo.je/wp-json/wc/store/v1/products';

    try {
        // সাধারণ ব্রাউজারের মতো হেডার পাঠিয়ে InfinityFree-এর বট ফিল্টার বাইপাস করার চেষ্টা
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://myportshow.xo.je/'
            }
        });

        const contentType = response.headers.get('content-type');
        
        // যদি InfinityFree JSON-এর বদলে HTML (aes.js বট চ্যালেঞ্জ) পাঠায়, তবে তা শনাক্ত করা
        if (!contentType || !contentType.includes('application/json')) {
            return res.status(403).json({ 
                blocked: true, 
                message: 'InfinityFree সার্ভার API রিকোয়েস্টের বদলে বট সিকিউরিটি পেজ পাঠিয়েছে।' 
            });
        }

        const data = await response.json();
        return res.status(200).json(data);

    } catch (error) {
        return res.status(500).json({ 
            blocked: true, 
            error: error.message 
        });
    }
}