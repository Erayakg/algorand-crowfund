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

def wait_for_confirmation(client, txid):
    status = client.status()
    last_round = status.get("last-round") or status.get("lastRound")
    txinfo = client.pending_transaction_info(txid)
    
    while not (txinfo.get("confirmed-round") or txinfo.get("confirmedRound")):
        print("Waiting for confirmation...")
        last_round += 1
        client.status_after_block(last_round)
        txinfo = client.pending_transaction_info(txid)
    
    print(f"Transaction {txid} confirmed in round {txinfo.get('confirmed-round') or txinfo.get('confirmedRound')}")
    return txinfo

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
    
    print(f"Created NFT-enabled app with id: {app_id}")
    return app_id

def main():
    # Get testnet credentials - CHANGE THESE TO YOUR CREDENTIALS
    creator_mnemonic = input("Enter your wallet mnemonic phrase: ")
    creator_private_key = mnemonic.to_private_key(creator_mnemonic)
    creator_address = account.address_from_private_key(creator_private_key)
    
    print(f"Deploying from address: {creator_address}")
    
    # Initialize algod client
    client = get_algod_client()
    
    # Read the compiled smart contract files
    with open("approval_simple_nft.teal", "r") as f:
        approval_program_source = f.read()
        
    with open("clear_simple_nft.teal", "r") as f:
        clear_program_source = f.read()
    
    # Compile programs
    approval_program = compile_program(client, approval_program_source)
    clear_program = compile_program(client, clear_program_source)
    
    # Define state schema
    global_schema = StateSchema(num_uints=64, num_byte_slices=64)  # Increased for NFT data
    local_schema = StateSchema(num_uints=16, num_byte_slices=16)   # For user contributions and NFTs
    
    # Create application
    app_id = create_app(client, creator_private_key, approval_program, clear_program, global_schema, local_schema)
    
    print(f"""
    🎉 NFT-enabled Crowdfunding Smart Contract deployed successfully!
    
    App ID: {app_id}
    Creator: {creator_address}
    Network: Algorand Testnet
    
    Features:
    - Create crowdfunding projects
    - Accept contributions 
    - Mint reward NFTs for contributors (minimum 10 ALGO)
    - Creator can withdraw funds
    
    Next steps:
    1. Update frontend APP_ID to {app_id}
    2. Test project creation
    3. Test contributions
    4. Test NFT minting
    """)
    
    return app_id

if __name__ == "__main__":
    main()