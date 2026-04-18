from fastapi import APIRouter

from app.api.routes import clustering, convolution, data, features, morphology, techniques

api_router = APIRouter()
api_router.include_router(data.router, prefix="/data", tags=["Data"])
api_router.include_router(techniques.router, prefix="/techniques", tags=["Techniques"])
api_router.include_router(convolution.router, prefix="/convolution", tags=["Convolution"])
api_router.include_router(morphology.router, prefix="/morphology", tags=["Morphology"])
api_router.include_router(features.router, prefix="/features", tags=["Feature Detection"])
api_router.include_router(clustering.router, prefix="/clustering", tags=["Unsupervised Learning"])
