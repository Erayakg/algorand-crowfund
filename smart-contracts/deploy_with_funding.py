import base64
from algosdk import account, mnemonic
from algosdk.v2client import algod
from algosdk.transaction import *
import algosdk.transaction as transaction
import json
import time

# Algorand Testnet configuration
algod_address = "https://testnet-api.algonode.cloud"
algod_token = ""

def get_algod_client():
    return algod.AlgodClient(algod_token, algod_address)

def create_app(client, private_key, approval_program, clear_program, global_schema, local_schema):
    sender = account.address_from_private_key(private_key)

    # Create transaction
    txn = ApplicationCreateTxn(
        sender=sender,
        sp=client.suggested_params(),
        on_complete=OnComplete.NoOpOC.real,
        approval_program=approval_program,
        clear_program=clear_program,
        global_schema=global_schema,
        local_schema=local_schema,
        app_args=[]
    )

    # Sign and send transaction
    signed_txn = txn.sign(private_key)
    tx_id = client.send_transaction(signed_txn)

    # Wait for confirmation
    wait_for_confirmation(client, tx_id)

    # Get transaction response
    tx_response = client.pending_transaction_info(tx_id)
    app_id = tx_response["application-index"]

    print(f"✅ Created app with id: {app_id}")
    return app_id

def wait_for_confirmation(client, txid, timeout=10):
    last_round = client.status().get('last-round')
    while True:
        try:
            pending_txn = client.pending_transaction_info(txid)
            if pending_txn.get('confirmed-round', 0) > 0:
                print(f"✅ Transaction {txid} confirmed in round {pending_txn.get('confirmed-round')}.")
                return pending_txn
        except Exception as e:
            print(f"⏳ Waiting for confirmation... {e}")

        last_round += 1
        client.status_after_block(last_round)

def check_balance(client, address):
    """Check account balance"""
    try:
        account_info = client.account_info(address)
        balance = account_info.get('amount', 0)
        return balance
    except Exception as e:
        print(f"❌ Error checking balance: {e}")
        return 0

def main():
    print("🚀 ALGORAND CROWDFUNDING DEPLOYMENT")
    print("=" * 50)
    
    # Use your funded account
    creator_mnemonic = "sphere reveal warm bright boy library crouch piano resemble blossom area napkin this key flip example swing digital sand one refuse surround imitate above huge"
    creator_private_key = mnemonic.to_private_key(creator_mnemonic)
    creator_address = account.address_from_private_key(creator_private_key)
    
    # Create contributor account
    contributor_private_key, contributor_address = account.generate_account()

    print(f"📝 Creator address: {creator_address}")
    print(f"📝 Contributor address: {contributor_address}")
    print()
    print("🔑 Creator mnemonic (already funded):")
    print(f"   {mnemonic.from_private_key(creator_private_key)}")
    print()
    print("🔑 Contributor mnemonic:")
    print(f"   {mnemonic.from_private_key(contributor_private_key)}")
    print()

    # Get Algod client
    client = get_algod_client()

    # Check balances first
    print("💰 Checking account balances...")
    creator_balance = check_balance(client, creator_address)
    contributor_balance = check_balance(client, contributor_address)
    
    print(f"Creator balance: {creator_balance / 1000000:.2f} ALGO")
    print(f"Contributor balance: {contributor_balance / 1000000:.2f} ALGO")
    print()

    if creator_balance < 1000000:  # Less than 1 ALGO
        print("⚠️  WARNING: Creator account has insufficient funds!")
        print("📥 Please get testnet ALGO from one of these sources:")
        print(f"   1. https://testnet.algoexplorer.io/dispenser")
        print(f"   2. https://bank.testnet.algorand.network/")
        print(f"   3. Pera Wallet testnet faucet")
        print(f"   Address: {creator_address}")
        print()
        
        response = input("Press Enter after you've funded the account, or 'q' to quit: ")
        if response.lower() == 'q':
            return
            
        # Recheck balance
        creator_balance = check_balance(client, creator_address)
        print(f"💰 Updated creator balance: {creator_balance / 1000000:.2f} ALGO")
        
        if creator_balance < 1000000:
            print("❌ Still insufficient funds. Please try again later.")
            return

    # Read compiled programs
    try:
        with open("approval_minimal.teal", "rb") as f:
            approval_program = f.read()
    except FileNotFoundError:
        print("❌ approval_minimal.teal not found. Please compile the contract first.")
        return

    try:
        with open("clear_minimal.teal", "rb") as f:
            clear_program = f.read()
    except FileNotFoundError:
        print("❌ clear_minimal.teal not found. Please compile the contract first.")
        return

    # Define state schemas
    global_schema = StateSchema(num_uints=16, num_byte_slices=16)
    local_schema = StateSchema(num_uints=8, num_byte_slices=8)

    print("🏗️  Deploying smart contract...")
    
    try:
        # Create the application
        app_id = create_app(client, creator_private_key, approval_program, clear_program, global_schema, local_schema)

        print("\n🎉 DEPLOYMENT SUCCESSFUL!")
        print("=" * 50)
        print(f"📱 Application ID: {app_id}")
        print(f"🌐 AlgoExplorer: https://testnet.algoexplorer.io/application/{app_id}")
        print()
        
        # Save the app ID to a file for frontend use
        with open("app_id.txt", "w") as f:
            f.write(str(app_id))
        
        print(f"💾 Application ID saved to app_id.txt")
        
        # Update frontend config
        print("\n🔧 Next steps:")
        print("1. Update frontend/src/utils/algorand.ts with the APP_ID")
        print("2. Run the frontend: cd ../frontend && npm run dev")
        print("3. Test the application with Pera Wallet")
        
    except Exception as e:
        print(f"❌ Deployment failed: {e}")
        print("This might be due to:")
        print("- Insufficient funds (need at least 1 ALGO)")
        print("- Network connectivity issues")
        print("- Smart contract compilation errors")

if __name__ == "__main__":
    main()
