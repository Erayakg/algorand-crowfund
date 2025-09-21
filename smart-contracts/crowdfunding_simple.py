from pyteal import *

def approval_program():
    # Simple cro        Return(Int(1))
    ])

    # Mint NFT reward for contributors
    mint_nft = Seq([
        Assert(Txn.application_args.length() == Int(2)),
        
        # Check if user has contributed at least 10 ALGO (10,000,000 microAlgos)
        Assert(App.localGet(Txn.sender(), Concat(Bytes("contrib_"), Itob(Btoi(Txn.application_args[1])))) >= Int(10000000)),
        
        # Check if NFT already minted for this project
        Assert(App.localGet(Txn.sender(), Concat(Bytes("nft_"), Itob(Btoi(Txn.application_args[1])))) == Int(0)),
        
        # Create NFT asset
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetConfig,
            TxnField.config_asset_total: Int(1),
            TxnField.config_asset_decimals: Int(0),
            TxnField.config_asset_default_frozen: Int(0),
            TxnField.config_asset_unit_name: Bytes("RWDNFT"),
            TxnField.config_asset_name: Concat(
                Bytes("Reward NFT - "),
                App.globalGet(Concat(Bytes("p_"), Itob(Btoi(Txn.application_args[1])), Bytes("_name")))
            ),
            TxnField.config_asset_url: Concat(
                Bytes("ipfs://Qm"),
                Substring(Sha256(Concat(Bytes("reward"), Itob(Btoi(Txn.application_args[1])), Txn.sender())), Int(0), Int(44))
            ),
            TxnField.fee: Int(1000)
        }),
        InnerTxnBuilder.Submit(),
        
        # Transfer NFT to contributor
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: InnerTxn.created_asset_id(),
            TxnField.asset_receiver: Txn.sender(),
            TxnField.asset_amount: Int(1),
            TxnField.fee: Int(1000)
        }),
        InnerTxnBuilder.Submit(),
        
        # Mark NFT as minted for this user/project
        App.localPut(Txn.sender(), Concat(Bytes("nft_"), Itob(Btoi(Txn.application_args[1]))), InnerTxn.created_asset_id()),
        
        Return(Int(1))
    ])

    handle_noop = Cond(
        [Txn.application_args[0] == Bytes("create"), create_project],
        [Txn.application_args[0] == Bytes("contribute"), contribute],
        [Txn.application_args[0] == Bytes("withdraw"), withdraw],
        [Txn.application_args[0] == Bytes("mint_nft"), mint_nft]
    ])g contract with basic functionality
    handle_creation = Seq([
        App.globalPut(Bytes("project_count"), Int(0)),
        Return(Int(1))
    ])

    handle_optin = Return(Int(1))
    handle_closeout = Return(Int(1))
    handle_updateapp = Return(Int(0))
    handle_deleteapp = Return(Int(0))

    # Create project
    create_project = Seq([
        Assert(Txn.application_args.length() == Int(6)),
        
        # Store basic project data
        App.globalPut(Concat(Bytes("p_"), Itob(App.globalGet(Bytes("project_count"))), Bytes("_name")), Txn.application_args[1]),
        App.globalPut(Concat(Bytes("p_"), Itob(App.globalGet(Bytes("project_count"))), Bytes("_target")), Btoi(Txn.application_args[3])),
        App.globalPut(Concat(Bytes("p_"), Itob(App.globalGet(Bytes("project_count"))), Bytes("_creator")), Txn.sender()),
        App.globalPut(Concat(Bytes("p_"), Itob(App.globalGet(Bytes("project_count"))), Bytes("_collected")), Int(0)),
        
        # Increment project count
        App.globalPut(Bytes("project_count"), App.globalGet(Bytes("project_count")) + Int(1)),
        Return(Int(1))
    ])

    # Contribute to project
    contribute = Seq([
        Assert(Global.group_size() == Int(2)),
        Assert(Gtxn[0].type_enum() == TxnType.Payment),
        Assert(Gtxn[0].receiver() == Global.current_application_address()),
        
        # Update collected amount
        App.globalPut(
            Concat(Bytes("p_"), Itob(Btoi(Txn.application_args[1])), Bytes("_collected")),
            App.globalGet(Concat(Bytes("p_"), Itob(Btoi(Txn.application_args[1])), Bytes("_collected"))) + Gtxn[0].amount()
        ),
        
        # Store contributor amount for NFT eligibility
        App.localPut(
            Txn.sender(), 
            Concat(Bytes("contrib_"), Itob(Btoi(Txn.application_args[1]))),
            App.localGet(Txn.sender(), Concat(Bytes("contrib_"), Itob(Btoi(Txn.application_args[1])))) + Gtxn[0].amount()
        ),
        
        Return(Int(1))
    ])

    # Withdraw funds (creator only)
    withdraw = Seq([
        Assert(Txn.sender() == App.globalGet(Concat(Bytes("p_"), Itob(Btoi(Txn.application_args[1])), Bytes("_creator")))),
        
        # Send funds to creator
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.Payment,
            TxnField.receiver: Txn.sender(),
            TxnField.amount: App.globalGet(Concat(Bytes("p_"), Itob(Btoi(Txn.application_args[1])), Bytes("_collected"))),
            TxnField.fee: Int(1000)
        }),
        InnerTxnBuilder.Submit(),
        
        Return(Int(1))
    ])

    handle_noop = Cond(
        [Txn.application_args[0] == Bytes("create"), create_project],
        [Txn.application_args[0] == Bytes("contribute"), contribute],
        [Txn.application_args[0] == Bytes("withdraw"), withdraw]
    )

    program = Cond(
        [Txn.application_id() == Int(0), handle_creation],
        [Txn.on_completion() == OnComplete.OptIn, handle_optin],
        [Txn.on_completion() == OnComplete.CloseOut, handle_closeout],
        [Txn.on_completion() == OnComplete.UpdateApplication, handle_updateapp],
        [Txn.on_completion() == OnComplete.DeleteApplication, handle_deleteapp],
        [Txn.on_completion() == OnComplete.NoOp, handle_noop]
    )

    return program

def clear_state_program():
    return Return(Int(1))

# Compile the programs
if __name__ == "__main__":
    approval_compiled = compileTeal(approval_program(), Mode.Application, version=8)
    clear_compiled = compileTeal(clear_state_program(), Mode.Application, version=8)

    with open("approval_simple.teal", "w") as f:
        f.write(approval_compiled)

    with open("clear_simple.teal", "w") as f:
        f.write(clear_compiled)

    print("Simplified smart contract compiled successfully!")
    print("Files created: approval_simple.teal, clear_simple.teal")
