from pyteal import *

def approval_program():
    # Global state variables
    global_project_count = App.globalGet(Bytes("project_count"))
    project_id = ScratchVar(TealType.uint64)
    contributor_amount = ScratchVar(TealType.uint64)
    project_target = ScratchVar(TealType.uint64)
    project_deadline = ScratchVar(TealType.uint64)
    project_collected = ScratchVar(TealType.uint64)
    reward_threshold = ScratchVar(TealType.uint64)

    @Subroutine(TealType.bytes)
    def project_key(id):
        return Concat(Bytes("project_"), Itob(id))

    @Subroutine(TealType.bytes)
    def contributor_key(project_id, contributor):
        return Concat(Bytes("contrib_"), Itob(project_id), Bytes("_"), contributor)

    # Helper function to get project data
    @Subroutine(TealType.none)
    def get_project_data():
        return Seq(
            project_target.store(App.globalGet(Concat(Bytes("project_"), Itob(Btoi(Txn.application_args[1])), Bytes("_target")))),
            project_deadline.store(App.globalGet(Concat(Bytes("project_"), Itob(Btoi(Txn.application_args[1])), Bytes("_deadline")))),
            project_collected.store(App.globalGet(Concat(Bytes("project_"), Itob(Btoi(Txn.application_args[1])), Bytes("_collected")))),
            reward_threshold.store(App.globalGet(Concat(Bytes("project_"), Itob(Btoi(Txn.application_args[1])), Bytes("_threshold"))))
        )

    # Application creation
    handle_creation = Seq([
        App.globalPut(Bytes("project_count"), Int(0)),
        Return(Int(1))
    ])

    # Opt-in to application
    handle_optin = Return(Int(1))

    # Close out from application
    handle_closeout = Return(Int(1))

    # Update application (disabled)
    handle_updateapp = Return(Int(0))

    # Delete application (disabled)
    handle_deleteapp = Return(Int(0))

    # Handle NoOp transactions
    handle_noop = Cond(
        # Create project
        [Txn.application_args[0] == Bytes("create_project"), Seq([
            Assert(Global.group_size() == Int(1)),
            Assert(Txn.application_args.length() == Int(6)),  # name, desc, target, deadline, category, threshold
            Assert(Btoi(Txn.application_args[3]) > Global.latest_timestamp()),  # deadline must be in future
            Assert(Btoi(Txn.application_args[5]) > Int(0)),  # threshold must be positive

            # Store project data
            App.globalPut(Concat(Bytes("project_"), Itob(global_project_count), Bytes("_name")), Txn.application_args[1]),
            App.globalPut(Concat(Bytes("project_"), Itob(global_project_count), Bytes("_desc")), Txn.application_args[2]),
            App.globalPut(Concat(Bytes("project_"), Itob(global_project_count), Bytes("_creator")), Txn.sender()),
            App.globalPut(Concat(Bytes("project_"), Itob(global_project_count), Bytes("_target")), Btoi(Txn.application_args[3])),
            App.globalPut(Concat(Bytes("project_"), Itob(global_project_count), Bytes("_deadline")), Btoi(Txn.application_args[3])),
            App.globalPut(Concat(Bytes("project_"), Itob(global_project_count), Bytes("_collected")), Int(0)),
            App.globalPut(Concat(Bytes("project_"), Itob(global_project_count), Bytes("_category")), Txn.application_args[4]),
            App.globalPut(Concat(Bytes("project_"), Itob(global_project_count), Bytes("_threshold")), Btoi(Txn.application_args[5])),
            App.globalPut(Concat(Bytes("project_"), Itob(global_project_count), Bytes("_active")), Int(1)),

            # Increment project count
            App.globalPut(Bytes("project_count"), global_project_count + Int(1)),
            Return(Int(1))
        ])],

        # Contribute to project
        [Txn.application_args[0] == Bytes("contribute"), Seq([
            Assert(Global.group_size() == Int(2)),
            Assert(Txn.group_index() == Int(1)),
            Assert(Gtxn[0].type_enum() == TxnType.Payment),
            Assert(Gtxn[0].receiver() == Global.current_application_address()),
            Assert(Gtxn[0].sender() == Txn.sender()),

            get_project_data(),

            Assert(project_target.load() > Int(0)),  # Project exists
            Assert(project_deadline.load() > Global.latest_timestamp()),  # Deadline not passed
            Assert(App.globalGet(Concat(Bytes("project_"), Itob(Btoi(Txn.application_args[1])), Bytes("_active"))) == Int(1)),

            # Update collected amount
            App.globalPut(
                Concat(Bytes("project_"), Itob(Btoi(Txn.application_args[1])), Bytes("_collected")),
                project_collected.load() + Gtxn[0].amount()
            ),

            # Update contributor amount
            contributor_amount.store(App.localGet(Txn.sender(), contributor_key(Btoi(Txn.application_args[1]), Txn.sender())) + Gtxn[0].amount()),
            App.localPut(Txn.sender(), contributor_key(Btoi(Txn.application_args[1]), Txn.sender()), contributor_amount.load()),

            Return(Int(1))
        ])],

        # Withdraw funds
        [Txn.application_args[0] == Bytes("withdraw"), Seq([
            Assert(Txn.application_args.length() == Int(2)),

            get_project_data(),

            Assert(project_target.load() > Int(0)),  # Project exists
            Assert(project_collected.load() >= project_target.load()),  # Target reached
            Assert(project_deadline.load() <= Global.latest_timestamp()),  # Deadline passed
            Assert(Txn.sender() == App.globalGet(Concat(Bytes("project_"), Itob(Btoi(Txn.application_args[1])), Bytes("_creator")))),

            # Mark project as inactive
            App.globalPut(Concat(Bytes("project_"), Itob(Btoi(Txn.application_args[1])), Bytes("_active")), Int(0)),

            # Send funds to creator
            InnerTxnBuilder.Begin(),
            InnerTxnBuilder.SetFields({
                TxnField.type_enum: TxnType.Payment,
                TxnField.receiver: Txn.sender(),
                TxnField.amount: project_collected.load(),
                TxnField.fee: Int(1000)
            }),
            InnerTxnBuilder.Submit(),

            Return(Int(1))
        ])],

        # Claim refund
        [Txn.application_args[0] == Bytes("refund"), Seq([
            Assert(Txn.application_args.length() == Int(2)),

            get_project_data(),

            Assert(project_target.load() > Int(0)),  # Project exists
            Assert(project_collected.load() < project_target.load()),  # Target not reached
            Assert(project_deadline.load() <= Global.latest_timestamp()),  # Deadline passed
            Assert(App.globalGet(Concat(Bytes("project_"), Itob(Btoi(Txn.application_args[1])), Bytes("_active"))) == Int(1)),

            # Check if user has contributed
            contributor_amount.store(App.localGet(Txn.sender(), contributor_key(Btoi(Txn.application_args[1]), Txn.sender()))),
            Assert(contributor_amount.load() > Int(0)),

            # Send refund to contributor
            InnerTxnBuilder.Begin(),
            InnerTxnBuilder.SetFields({
                TxnField.type_enum: TxnType.Payment,
                TxnField.receiver: Txn.sender(),
                TxnField.amount: contributor_amount.load(),
                TxnField.fee: Int(1000)
            }),
            InnerTxnBuilder.Submit(),

            # Clear contributor's local state
            App.localPut(Txn.sender(), contributor_key(Btoi(Txn.application_args[1]), Txn.sender()), Int(0)),

            Return(Int(1))
        ])],

        # Mint reward NFT
        [Txn.application_args[0] == Bytes("mint_nft"), Seq([
            Assert(Txn.application_args.length() == Int(2)),

            get_project_data(),

            Assert(project_target.load() > Int(0)),  # Project exists
            Assert(project_collected.load() >= project_target.load()),  # Target reached
            Assert(project_deadline.load() <= Global.latest_timestamp()),  # Deadline passed

            # Check if contributor meets threshold
            contributor_amount.store(App.localGet(Txn.sender(), contributor_key(Btoi(Txn.application_args[1]), Txn.sender()))),
            Assert(contributor_amount.load() >= reward_threshold.load()),

            # Check if NFT already minted
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
                    App.globalGet(Concat(Bytes("project_"), Itob(Btoi(Txn.application_args[1])), Bytes("_name")))
                ),
                TxnField.config_asset_url: Concat(
                    Bytes("ipfs://"),
                    Sha256(Concat(Bytes("metadata"), Itob(Btoi(Txn.application_args[1])), Txn.sender()))
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

            # Mark NFT as minted
            App.localPut(Txn.sender(), Concat(Bytes("nft_"), Itob(Btoi(Txn.application_args[1]))), Int(1)),

            Return(Int(1))
        ])]
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

    with open("approval.teal", "w") as f:
        f.write(approval_compiled)

    with open("clear.teal", "w") as f:
        f.write(clear_compiled)

    print("Smart contract compiled successfully!")
    print("Files created: approval.teal, clear.teal")
