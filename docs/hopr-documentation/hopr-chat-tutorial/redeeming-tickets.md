---
description: >-
  Learn about earning and redeeming tickets, which are generated by the HOPR
  proof-of-relay mechanism
---

# Earning and Redeeming Tickets

The HOPR private mixnet is kept secure using proof-of-relay. This mechanism ensures that nodes do not receive payment until they have completed their relaying duties.

When you receive data to relay from an upstream node, it will be accompanied by half of an encrypted payment key. You will only receive the second half when you relay the data to the next node in the chain. Once you have both halves of the payment key, they are automatically combined to form a **ticket**. These tickets can be redeemed for HOPR tokens.

{% hint style="danger" %}
You need to redeem any unredeemed tickets before the corresponding payment channel is closed. Every payment channel has a cool-off after closure is initialized to give both parties a chance to complete ticket redemption.
{% endhint %}

To see how many tickets you currently have, type:

```text
tickets
```

You'll see how many unredeemed tickets you currently have, along with their value in HOPR.

```text
tickets
Found 3 unredeemed tickets with a value of 0.000000000000000297 HOPR
```

To redeem your tickets, type:

```text
redeemTickets
```

This will attempt to redeem all of your tickets. The HOPR from these tickets will be added to your balance. You'll get a notification as each ticket is redeemed, liked this:

```text
Redeemed 2 out of 5 tickets with a sum of 0.0000000000000002 HOPR
```

{% hint style="warning" %}
Redeeming tickets requires calling the HOPR smart contract, so can take some time. You will be notified as each ticket is redeemed.
{% endhint %}

{% hint style="danger" %}
Redeeming tickets requires calling the HOPR smart contract, so will incur a small fee in the native currency. Make sure you have enough in your `balance` to complete this action.
{% endhint %}
