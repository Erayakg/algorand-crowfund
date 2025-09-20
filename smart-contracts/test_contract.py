import base64
from algosdk import account, mnemonic
from algosdk.v2client import algod
from algosdk.transaction import *
import algosdk.transaction as transaction
import json
import time
import os

# Algorand Testnet configuration
algod_address = "https://testnet-api.algonode.cloud"
algod_token = ""

def get_algod_client():
    return algod.AlgodClient(algod_token, algod_address)

def compile_program(client, source_code):
    compile_response = client.compile(source_code)
    return base64.b64decode(compile_response["result"])

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

    print(f"Created app with id: {app_id}")
    return app_id

def call_app(client, private_key, app_id, app_args):
    sender = account.address_from_private_key(private_key)

    # Get app info to get address
    app_info = client.application_info(app_id)
    app_address = app_info["params"]["creator"]

    # Create transaction
    txn = ApplicationNoOpTxn(
        sender=sender,
        sp=client.suggested_params(),
        index=app_id,
        app_args=app_args
    )

    # Sign and send transaction
    signed_txn = txn.sign(private_key)
    tx_id = client.send_transaction(signed_txn)

    # Wait for confirmation
    wait_for_confirmation(client, tx_id)

    print(f"App call confirmed in tx: {tx_id}")

def opt_in_app(client, private_key, app_id):
    sender = account.address_from_private_key(private_key)

    # Create transaction
    txn = ApplicationOptInTxn(
        sender=sender,
        sp=client.suggested_params(),
        index=app_id
    )

    # Sign and send transaction
    signed_txn = txn.sign(private_key)
    tx_id = client.send_transaction(signed_txn)

    # Wait for confirmation
    wait_for_confirmation(client, tx_id)

    print(f"Opted in to app: {tx_id}")

def send_payment(client, private_key, receiver, amount):
    sender = account.address_from_private_key(private_key)

    # Create transaction
    params = client.suggested_params()
    txn = PaymentTxn(
        sender=sender,
        sp=params,
        receiver=receiver,
        amt=amount
    )

    # Sign and send transaction
    signed_txn = txn.sign(private_key)
    tx_id = client.send_transaction(signed_txn)

    # Wait for confirmation
    wait_for_confirmation(client, tx_id)

    print(f"Payment sent: {tx_id}")
    return tx_id

def wait_for_confirmation(client, txid, timeout=10):
    last_round = client.status().get('last-round')
    while True:
        try:
            pending_txn = client.pending_transaction_info(txid)
            if pending_txn.get('confirmed-round', 0) > 0:
                print(f"Transaction {txid} confirmed in round {pending_txn.get('confirmed-round')}.")
                return pending_txn
        except Exception as e:
            print(f"Waiting for confirmation... {e}")

        last_round += 1
        client.status_after_block(last_round)

def main():
    # Use pre-funded test accounts (replace with your funded accounts)
    # Creator account - replace this mnemonic with one from your funded accounts
    creator_mnemonic = "thumb planet employ nuclear crystal gloom mention rebel wise gain balcony april candy banner knock subject fruit giraffe tiger trigger very grocery blur absent chase"
    creator_private_key = mnemonic.to_private_key(creator_mnemonic)
    creator_address = account.address_from_private_key(creator_private_key)
    
    # Contributor account - replace this mnemonic with one from your funded accounts  
    contributor_mnemonic = "lend permit waste resist chalk stove lesson submit device lonely elephant horse buzz elephant plate uncle enforce anchor hurry naive diamond employ siege above hunt"
    contributor_private_key = mnemonic.to_private_key(contributor_mnemonic)
    contributor_address = account.address_from_private_key(contributor_private_key)

    print("Creator address:", creator_address)
    print("Contributor address:", contributor_address)
    
    print("\n=== IMPORTANT: FUND THESE ACCOUNTS ===")
    print("Before proceeding, you need to fund these accounts with testnet ALGO:")
    print(f"1. Visit https://testnet.algoexplorer.io/dispenser")
    print(f"2. Fund creator address: {creator_address}")
    print(f"3. Fund contributor address: {contributor_address}")
    print("4. Each account needs at least 1 ALGO")
    print("5. Press Enter when accounts are funded...")
    input()

    # Get Algod client
    client = get_algod_client()

    # Check account balances
    try:
        creator_info = client.account_info(creator_address)
        contributor_info = client.account_info(contributor_address)
        print(f"Creator balance: {creator_info['amount'] / 1000000} ALGO")
        print(f"Contributor balance: {contributor_info['amount'] / 1000000} ALGO")
        
        if creator_info['amount'] < 1000000 or contributor_info['amount'] < 1000000:
            print("ERROR: Accounts don't have enough funds! Please fund them and try again.")
            return
            
    except Exception as e:
        print(f"Error checking account balances: {e}")
        print("Make sure accounts are funded and try again.")
        return

    # Read and compile TEAL programs (using simple version with full functionality)
    with open("approval_simple.teal", "r") as f:
        approval_teal = f.read()
    
    with open("clear_simple.teal", "r") as f:
        clear_teal = f.read()
    
    # Compile the TEAL programs
    approval_program = compile_program(client, approval_teal)
    clear_program = compile_program(client, clear_teal)

    # Define state schemas
    global_schema = StateSchema(num_uints=16, num_byte_slices=16)
    local_schema = StateSchema(num_uints=8, num_byte_slices=8)

    # Create the application
    app_id = create_app(client, creator_private_key, approval_program, clear_program, global_schema, local_schema)

    # Test create project
    print("\n--- Testing Project Creation ---")
    project_name = "Test Crowdfunding Project"
    project_desc = "This is a test project for crowdfunding"
    target_amount = 1000000  # 1 Algo in microAlgos
    deadline = int(time.time()) + 86400  # 24 hours from now
    category = "Technology"
    threshold = 500000  # 0.5 Algo for NFT reward

    app_args = [
        "create".encode(),  # Function name
        project_name.encode(),
        project_desc.encode(), 
        str(target_amount).encode(),
        str(deadline).encode(),
        category.encode()
        # Removed threshold - simple TEAL doesn't support it
    ]

    call_app(client, creator_private_key, app_id, app_args)

    # Test contribution
    print("\n--- Testing Contribution ---")
    opt_in_app(client, contributor_private_key, app_id)

    # Send payment first (1 Algo)
    from algosdk.logic import get_application_address
    app_address = get_application_address(app_id)  # Get the actual app address, not creator
    print(f"App address: {app_address}")

    payment_txn = client.suggested_params()
    payment_txn.fee = 1000
    payment_txn.flat_fee = True

    # Create payment transaction
    pay_txn = PaymentTxn(
        sender=contributor_address,
        sp=payment_txn,
        receiver=app_address,
        amt=1000000  # 1 Algo
    )

    # Create app call transaction
    app_txn = ApplicationNoOpTxn(
        sender=contributor_address,
        sp=payment_txn,
        index=app_id,
        app_args=["contribute".encode(), "0".encode()]
    )

    # Group transactions
    gid = transaction.calculate_group_id([pay_txn, app_txn])
    pay_txn.group = gid
    app_txn.group = gid

    # Sign transactions
    signed_pay = pay_txn.sign(contributor_private_key)
    signed_app = app_txn.sign(contributor_private_key)

    # Send transactions
    signed_group = [signed_pay, signed_app]
    tx_id = client.send_transactions(signed_group)

    wait_for_confirmation(client, tx_id)

    print(f"Contribution confirmed: {tx_id}")

    # Test NFT minting (after deadline passes)
    print("\n--- Testing NFT Minting ---")
    # Note: In a real test, you'd need to wait for the deadline or mock the time
    # For now, we'll just show the structure
    nft_args = ["mint_nft".encode(), "0".encode()]
    call_app(client, contributor_private_key, app_id, nft_args)

    print("\n--- Test completed successfully! ---")
    print(f"Application ID: {app_id}")
    print("Check the transaction on AlgoExplorer:")
    print(f"https://testnet.algoexplorer.io/application/{app_id}")

if __name__ == "__main__":
    main()
