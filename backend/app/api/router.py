from fastapi import APIRouter

from app.api.routes import analysis, clustering, convolution, data, features, morphology, techniques, quantization, noise, feature_matching

api_router = APIRouter()
api_router.include_router(data.router, prefix="/data", tags=["Data"])
api_router.include_router(techniques.router, prefix="/techniques", tags=["Techniques"])
api_router.include_router(convolution.router, prefix="/convolution", tags=["Convolution"])
api_router.include_router(morphology.router, prefix="/morphology", tags=["Morphology"])
api_router.include_router(features.router, prefix="/features", tags=["Feature Detection"])
api_router.include_router(clustering.router, prefix="/clustering", tags=["Unsupervised Learning"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["Analysis"])
api_router.include_router(quantization.router, prefix="/quantization", tags=["Quantization"])
api_router.include_router(noise.router, prefix="/noise", tags=["Noise"])
api_router.include_router(feature_matching.router, prefix="/feature-matching", tags=["Feature Matching"])
