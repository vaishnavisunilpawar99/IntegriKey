import logging
import algokit_utils

logger = logging.getLogger(__name__)


def deploy() -> None:
    from smart_contracts.artifacts.zkp_vault.zkp_vault_client import (
        ZkpVaultFactory,
        ZkpVaultMethodCallCreateParams,
    )

    algorand = algokit_utils.AlgorandClient.from_environment()
    deployer = algorand.account.from_environment("DEPLOYER")

    factory = algorand.client.get_typed_app_factory(
        ZkpVaultFactory,
        default_sender=deployer.address,
        default_signer=deployer.signer,
    )

    # 🔑 IMPORTANT: use ABI create method
    app_client, result = factory.deploy(
        on_update=algokit_utils.OnUpdate.AppendApp,
        on_schema_break=algokit_utils.OnSchemaBreak.AppendApp,
        create_params=ZkpVaultMethodCallCreateParams(
            method="create_application()void"
        ),
    )

    logger.info("✅ IntegriKey deployed successfully")
    logger.info(f"🆔 App ID: {app_client.app_id}")
    logger.info(f"📍 App Address: {app_client.app_address}")
