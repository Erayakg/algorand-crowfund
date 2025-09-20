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
    # Create test accounts
    creator_private_key, creator_address = account.generate_account()
    contributor_private_key, contributor_address = account.generate_account()

    print("Creator address:", creator_address)
    print("Contributor address:", contributor_address)
    print("Creator mnemonic:", mnemonic.from_private_key(creator_private_key))
    print("Contributor mnemonic:", mnemonic.from_private_key(contributor_private_key))

    # Get Algod client
    client = get_algod_client()

    # Read compiled programs
    with open("approval_simple.teal", "rb") as f:
        approval_program = f.read()

    with open("clear_simple.teal", "rb") as f:
        clear_program = f.read()

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
        "create".encode(),
        project_name.encode(),
        project_desc.encode(),
        str(target_amount).encode(),
        str(deadline).encode(),
        category.encode(),
        str(threshold).encode()
    ]

    call_app(client, creator_private_key, app_id, app_args)

    print("\n--- Test completed successfully! ---")
    print(f"Application ID: {app_id}")
    print("Check the transaction on AlgoExplorer:")
    print(f"https://testnet.algoexplorer.io/application/{app_id}")
    
    # Save the app ID to a file for frontend use
    with open("app_id.txt", "w") as f:
        f.write(str(app_id))
    
    print(f"Application ID saved to app_id.txt")

if __name__ == "__main__":
    main()
