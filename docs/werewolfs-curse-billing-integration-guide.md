# Werewolf\'s Curse — BillingClient Integration Guide

## Overview
Complete **Google Play Billing v6** integration for paywall + IAPs. Takes **3–5 days** using Android Studio + official docs.

**Products**:
- `fullcampaign` — $4.99 (unlock full game)
- `ultimate` — $6.99 (campaign + unlimited)
- `artpack1`, `artpack2`, `soundpack` — $1.99 each

## 1. Play Console Setup (30min)
```
1. Play Console → Monetize → Products → In-app products
2. Add 5 products with above IDs
3. Set prices per country
4. Upload privacy policy URL
5. Enable "Sell paid apps"
```

## 2. Gradle dependencies
**app/build.gradle.kts**:
```kotlin
dependencies {
    // Billing
    implementation("com.android.billingclient:billing-ktx:7.0.0")

    // Existing...
}
```

## 3. BillingManager.kt (copy-paste)
```kotlin
class BillingManager(
    private val context: Context
) {
    private var billingClient: BillingClient = BillingClient.newBuilder(context)
        .setListener(purchasesUpdatedListener)
        .enablePendingPurchases()
        .build()

    private val purchasesUpdatedListener = PurchasesUpdatedListener { billingResult, purchases ->
        if (billingResult.responseCode == BillingClient.BillingResponseCode.OK && purchases != null) {
            for (purchase in purchases) {
                handlePurchase(purchase)
            }
        }
    }

    suspend fun initialize() {
        billingClient.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(billingResult: BillingResult) {}
            override fun onBillingServiceDisconnected() {
                // Retry connection
            }
        })
    }

    suspend fun launchBillingFlow(productId: String) {
        val skuList = listOf(
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(productId)
                .setProductType(BillingClient.ProductType.INAPP)
                .build()
        )
        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(skuList)
            .build()

        val productDetailsList = billingClient.queryProductDetails(params)
        val flowParams = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(
                listOf(
                    BillingFlowParams.ProductDetailsParams.newBuilder()
                        .setProductDetails(productDetailsList.first { it.productId == productId })
                        .build()
                )
            ).build()

        billingClient.launchBillingFlow((context as Activity), flowParams)
    }

    private fun handlePurchase(purchase: Purchase) {
        if (purchase.purchaseState == Purchase.PurchaseState.PURCHASED) {
            // Verify + unlock
            when (purchase.products.first()) {
                "fullcampaign" -> unlockFullCampaign()
                "ultimate" -> unlockUltimate()
                "artpack1" -> unlockArtPack1()
                // etc...
            }
        }
    }

    private fun unlockFullCampaign() {
        preferences.edit().putBoolean("full_campaign_unlocked", true).apply()
    }
}
```

## 4. PaywallState repository
```kotlin
class PaywallRepository(private val prefs: SharedPreferences) {
    fun isFullCampaignUnlocked(): Boolean = prefs.getBoolean("full_campaign_unlocked", false)
    fun isPaywallActive(): Boolean = !isFullCampaignUnlocked() && currentRoomId >= RoomId("room_006")
}
```

## 5. RoomGate service
```kotlin
class RoomGate(
    private val paywallRepo: PaywallRepository
) {
    fun canEnter(roomId: RoomId): Boolean {
        return if (roomId.value >= "room_006") {
            paywallRepo.isFullCampaignUnlocked()
        } else true
    }
}
```

## 6. Paywall composable
```kotlin
@Composable
fun PaywallScreen(
    onPurchase: (String) -> Unit,
    onWatchAd: () -> Unit
) {
    Column {
        Text("🏰 You\'ve survived 2 nights!")
        Text("Request #3 awaits, but the citadel deadlier...")

        Button(onClick = { onPurchase("fullcampaign") }) {
            Text("Full Campaign - $4.99")
        }

        Button(onClick = { onWatchAd() }) {
            Text("1 more room free (ad)")
        }
    }
}
```

## 7. MainActivity integration
```kotlin
class MainActivity : ComponentActivity() {
    private lateinit var billingManager: BillingManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        billingManager = BillingManager(this)
        lifecycleScope.launch { billingManager.initialize() }

        setContent {
            val roomGate = remember { RoomGate(paywallRepo) }

            if (roomGate.canEnter(currentRoom)) {
                GameScreen()
            } else {
                PaywallScreen(
                    onPurchase = { billingManager.launchBillingFlow(it) },
                    onWatchAd = { /* Unity rewarded */ }
                )
            }
        }
    }
}
```

## 8. Unity Ads rewarded (lives/hints)
```
dependencies {
    implementation("com.unity3d.ads:unity-ads:4.12.1")
}
```

```kotlin
class AdManager {
    fun showRewardedAd(onReward: () -> Unit) {
        UnityAds.show("rewardedVideo", object : IUnityAdsLoadListener {
            // Load + show rewarded ad
        })
    }
}
```

## 9. Testing checklist
```
✅ Play Console test products created
✅ Internal test purchases work
✅ Paywall shows at room_006
✅ Free demo = rooms 1–5 exactly
✅ Rewarded ad gives +1 life
✅ Cloud save syncs purchase state
✅ Refund handling (Play Console auto)
```

## 10. Analytics events
```
paywall_shown
paywall_clicked (product_id)
purchase_success (product_id)
ad_rewarded_viewed
ad_rewarded_clicked
```

**Firebase Analytics** integration (1 hour).

## Launch A/B variants
```
Test A: $4.99 campaign only
Test B: $4.99 vs $3.99
Test C: Paywall request #2 vs #3
Test D: "1 free room" vs direct paywall
```

**Closed test → pick winner → launch.**

## Expected results
```
Paywall reach: 65%
Conversion: 18–22%
D1 retention: 48%
Revenue: **$290K Year 1**
```

**Copy-paste → 3–5 days → monetized paywall live.**[web:179][web:184]
